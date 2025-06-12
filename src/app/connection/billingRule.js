import prisma from "../../database/database.js";
import { getToken } from "../core/getToken.js";
import { getAllSales, getCustomerData, getItemId } from "./externalConnections/contaAzulStrategy.js";
import { SendMail } from "./externalConnections/emailService.js";
import { SendSimpleWpp } from "./externalConnections/wpp.js";


const delay = ms => new Promise(res => setTimeout(res, ms));


const messages = ({ nameCustomer, payment, idSale, message, product_or_service_related }) => {

    const possibilities = {
        "nome-cliente": nameCustomer,
        "valor-cheio": product_or_service_related.value.toLocaleString("pt-BR", { style: 'currency', currency: 'brl' }),
        "data-vencimento": new Date(payment.installment.due_date).toLocaleDateString('pt-BR'),
        "link-pagamento": " https://app.contaazul.com/pub/#/invoice/v2/" + idSale + "  ",
        "produto-servico-relacionado": product_or_service_related.name,
        "quebra-linha": "\n",
        "pula-linha": "\n\n",
    };
    const keys = Object.keys(possibilities);

    for (let index = 0; index < keys.length; index++) {
        message = message.replace(`{{${keys[index]}}}`, `${possibilities[keys[index]]}`)
        message = message.replace(/  +/g, '\n\n')

    }

    return message
}


const calculateDates = (initialDate, toIncrease, type) => {

    const date = new Date(initialDate)

    switch (type) {
        case 'increase':
            new Date(date.setDate(date.getDate() + toIncrease)).toISOString().split(".")[0]
            break;
        case 'decrease':
            new Date(date.setDate(date.getDate() - toIncrease)).toISOString().split(".")[0]
            break;

        default:
            date.toISOString().split(".")[0]
            break;
    }

    return date

}

const findDates = async (data, dateToFind) => {
    const paymentDate = new Date(dateToFind).toISOString().split(".")[0]


    const filtered = data.filter(res => {
        if (res.payment.installments[0]) return res.payment.installments[0].due_date === paymentDate && res
    })

    return filtered
}


const dispatchReminders = async ({ billingAplied, reminderMethod, message, where, date }) => {

    for (let index = 0; index < billingAplied.length; index++) {
        const sale = billingAplied[index];

        const {
            idSale, nameCustomer, payment, product_or_service_related,
            business_phone, email
        } = sale


        if (nameCustomer.includes("CANCELADO")) continue

        const messageCustomized = await messages({
            idSale, message, nameCustomer, payment, product_or_service_related
        })

        const { whatsapp, email: emailReminder } = reminderMethod;

        if (whatsapp) await SendSimpleWpp(
            nameCustomer,
            business_phone,
            messageCustomized,
            ['automação', 'cobranças']
        );

        if (emailReminder) await SendMail({
            subject: "Lembrete de pagamento",
            to: email,
            text: messageCustomized
        });

        await delay(2000);
    }
}


class BillingRulesExec {


    constructor(header) {
        this.header = header;
        Object.freeze(this.header);
    }

    async filterForServiceOrProductSelected(data, rulesProducts) {
        const ruleAplied = []


        for (let index = 0; index < data.length; index++) {
            const eachSale = data[index];

            const { id: idSale, payment, customer, service_discount, product_discount } = eachSale;

            const { id: idCustomer, name: nameCustomer } = customer

            const [customerData, relatedItemToSale] = await Promise.all([
                getCustomerData(this.header, idCustomer),
                getItemId(idSale, this.header)

            ])


            const related = rulesProducts.find(
                res => res.name === relatedItemToSale[0]?.item.name
            )

            const { value } = relatedItemToSale.find(res =>
                res => res.name === related.name
            )


            if (!customerData || !related) continue

            const { business_phone, email } = customerData
            const { installments, method } = payment


            if (installments[0] &&
                installments[0].status === 'PENDING') ruleAplied.push({
                    idSale,
                    nameCustomer,
                    service_discount,
                    product_discount,
                    business_phone,
                    email,
                    product_or_service_related: {
                        ...related,
                        value
                    },
                    payment: {
                        method,
                        installment: installments[0],
                    }
                })

            await delay(2000)
        }

        return ruleAplied
    }

    async before(rules, data) {
        const today = new Date().setUTCHours(0, 0, 0, 0)

        for (let index = 0; index < rules.length; index++) {
            const element = rules[index];

            const { reminderMethod, daysToAction, category,
                productsRelated, servicesRelated, message } = element;

            const increasedDate = await calculateDates(today, daysToAction, 'increase')

            const toAplie = await findDates(data, increasedDate)

            const billingAplied = await this.filterForServiceOrProductSelected(
                toAplie,
                category === 'Product' ?
                    productsRelated : servicesRelated
            )


            billingAplied.length > 0 &&
                await dispatchReminders({
                    where: "before",
                    date: increasedDate,
                    billingAplied,
                    reminderMethod,
                    message,
                })
        }
    }

    async at(rules, data) {
        const today = new Date().setUTCHours(0, 0, 0, 0)

        for (let index = 0; index < rules.length; index++) {
            const element = rules[index];

            const { reminderMethod, daysToAction, category,
                productsRelated, servicesRelated, message } = element;

            const atDay = await calculateDates(today, daysToAction, '')

            const toAplie = await findDates(data, atDay)

            const billingAplied = await this.filterForServiceOrProductSelected(
                toAplie,
                category === 'Product' ?
                    productsRelated : servicesRelated
            );


            billingAplied.length > 0 &&
                await dispatchReminders({
                    where: "at",
                    date: atDay,
                    billingAplied,
                    reminderMethod,
                    message,
                })
        }
    }

    async after(rules, data) {
        const today = new Date().setUTCHours(0, 0, 0, 0)

        for (let index = 0; index < rules.length; index++) {
            const element = rules[index];

            const { reminderMethod, daysToAction, category,
                productsRelated, servicesRelated, message } = element;

            const decreasedDate = await calculateDates(today, daysToAction, 'decrease')

            const toAplie = await findDates(data, decreasedDate)

            const billingAplied = await this.filterForServiceOrProductSelected(
                toAplie,
                category === 'Product' ?
                    productsRelated : servicesRelated
            )


            billingAplied.length > 0 &&
                await dispatchReminders({
                    where: "after",
                    date: decreasedDate,
                    billingAplied,
                    reminderMethod,
                    message,
                })
        }
    }


    async GatheringDatabaseBillingRules(data) {

        const typesTrigger = [
            'BEFORE',
            'AT',
            'AFTER'
        ]

        for (let index = 0; index < typesTrigger.length; index++) {
            const element = typesTrigger[index];

            const rules = await prisma.billingRules.findMany({
                include: {
                    productsRelated: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    servicesRelated: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                },
                where: {
                    status: true,
                    typeTrigger: element
                }
            })

            if (element === 'BEFORE') await this.before(rules, data)
            if (element === 'AT') await this.at(rules, data)
            if (element === 'AFTER') await this.after(rules, data)
        }


    }

    async getDataContaAzulData(pages) {
        const data = await getAllSales(this.header, pages, 120, 60)

        return data
    }

    async init(pages) {
        try {
            const contracts = await this.getDataContaAzulData(pages)
            if (!contracts) throw new Error("Init data came as null");

            const { data, has_more } = contracts
            console.log({
                pages,
            })
            await this.GatheringDatabaseBillingRules(data);

            has_more && this.init(pages + 1);

        } catch (error) {
            console.log(error)
        }
    }

}



const chargingBillingRules = () => {

    ["PTB", "Centro"].forEach(async unity => {

        try {
            const token = await getToken(unity, 'refresh')


            const startBilling = new BillingRulesExec({
                "Authorization": `Bearer ${token}`
            })

            console.log(`[CHARGEBILLING: ${unity}]`);

            await startBilling.init(0);
        } catch (error) {
            console.log(error)
        }

    });
}


export default chargingBillingRules