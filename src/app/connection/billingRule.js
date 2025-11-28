import prisma from "../../database/database.js";
import { getNewToken } from "../core/getToken.js";
import { customerShoppings, getClienteData, getFinancialDataFromContaAzul, getSaleData, getSaleItem } from "./externalConnections/contaAzulStrategy.js";
import { SendMail } from "./externalConnections/emailService.js";
import { SendGroupAlerts, SendSimpleWpp } from "./externalConnections/wpp.js";


const delay = ms => new Promise(res => setTimeout(res, ms));


const messages = ({ nameCustomer, payment, idSale, message, product_or_service_related }) => {

    const possibilities = {
        "nome-cliente": nameCustomer,
        "valor-cheio": payment['value'].toLocaleString("pt-BR", { style: 'currency', currency: 'brl' }),
        "data-vencimento": new Date(payment['due_date']).toLocaleDateString('pt-BR'),
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

const dispatchReminders = async ({ billingAplied, reminderMethod, message, unity, date }) => {

    let chat = unity === "Centro" ?
        process.env.UMBLER_CHAT_REM_ID_CENTRO : process.env.UMBLER_CHAT_REM_ID_PTB

    console.log({
        date,
        unity,
        b: billingAplied.map(res => { return { name: res.nameCustomer, payment: res.payment.due_date } }),
    })


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

        if (!business_phone) await SendGroupAlerts(
            `${nameCustomer} está sem número de contato cadastrado`,
            chat);

        if (emailReminder) await SendMail({
            subject: "Lembrete de pagamento",
            to: email,
            text: messageCustomized
        });


        if (whatsapp) await SendSimpleWpp(
            nameCustomer,
            business_phone,
            messageCustomized,
            ['automação', 'cobranças']
        );

        await delay(5000);
    }
}

class BillingRulesExec {


    constructor(header, unity, page) {
        this.header = header;
        this.unity = unity;
        this.page = page
        Object.freeze(this.header);
    }

    async filterForServiceOrProductSelected(data, rulesProducts) {
        const ruleAplied = [];

        for (let index = 0; index < data.length; index++) {
            const eachSale = data[index];


            const { cliente, total } = eachSale;
            const { id: idCustomer, nome: nameCustomer } = cliente;

            try {

                const [customerData, customerSales] = await Promise.all([
                    getClienteData(idCustomer, this.header),
                    customerShoppings(idCustomer, this.header)

                ])

                if (!customerSales) continue;

                const { data: sales } = customerSales;

                if (sales?.length === 0) {

                    console.log({
                        sales,
                        error: "Sem venda cadastrada para essa parcela."
                    })

                    continue
                }


                const sale = sales.find(res => res.total === total);
                if (!sale) continue;

                const [relatedItemToSale, saleData] = await Promise.all([
                    getSaleItem(sale?.id, this.header),
                    getSaleData(sale?.id, this.header)
                ])

                if (!customerData || !relatedItemToSale || !saleData) {

                    console.log({
                        errorData:
                            relatedItemToSale ?? saleData,
                        error: "Sem venda cadastrada para essa parcela.",


                        nameCustomer,
                        page: this.page, unity: this.unity
                    })

                    continue
                }

                const related = rulesProducts.find(
                    res => res.name === relatedItemToSale[0]?.nome
                )

                const { telefone_comercial, telefone_celular, email } = customerData;
                const { venda, observacoes_pagamento: _, vendedor: __ } = saleData;

                if (!related) continue;

                console.time(`processo ${nameCustomer} - ${index}`);

                const { valor } = relatedItemToSale.find(
                    res => res.nome === related?.name
                )


                const payment = {
                    method: venda.tipo_pagamento,
                    quantity_parcels: venda.opcao_condicao_pagamento,
                    due_date: venda.parcelas[0]?.data_vencimento,
                    value: venda.parcelas[0]?.valor
                }

                await delay(7000)
                console.timeEnd(`processo ${nameCustomer} - ${index}`)

                ruleAplied.push({
                    idSale: sale?.id,
                    nameCustomer,
                    business_phone: telefone_comercial || telefone_celular,
                    email,
                    product_or_service_related: {
                        ...related,
                        value: valor
                    },
                    payment,
                })

            } catch (error) {
                console.log({ error, eachSale })
                continue
            }

        }

        return ruleAplied
    }

    async aplyRule(rules, page) {

        const today = new Date().setUTCHours(0, 0, 0, 0)

        for (let index = 0; index < rules.length; index++) {
            const element = rules[index];

            const { reminderMethod, daysToAction, category,
                productsRelated, servicesRelated, message, typeTrigger } = element;

            const triggerType = {
                'AT': '',
                'BEFORE': 'increase',
                'AFTER': 'decrease'
            }

            const atDay = await calculateDates(today, daysToAction, triggerType[typeTrigger]);
            const filteredData = await this.getContaAzulData(page, atDay, atDay);

            console.log({ daysToAction, filteredData })


            if (!filteredData) {
                // await updatePage(idUni, pages)
                throw new Error("Init data came as null")
            };

            const { data, has_more, total } = filteredData;
            if (data.length === 0) continue;

            const billingAplied = await this.filterForServiceOrProductSelected(
                data,
                category === 'Product' ?
                    productsRelated : servicesRelated
            );

            if (billingAplied.length === 0) continue;

            billingAplied.length > 0 &&
                await dispatchReminders({
                    where: "at",
                    date: atDay,
                    billingAplied,
                    reminderMethod,
                    message,
                    unity: this.unity

                })

            if (has_more) await this.aplyRule(rules, this.page + 1)
        }

    }

    async GatheringDatabaseBillingRules() {

        const typesTrigger = [
            // 'AT',
            'BEFORE',
            'AFTER'
        ]

        for (let index = 0; index < typesTrigger.length; index++) {
            const element = typesTrigger[index];

            const rules = await prisma.billings.findMany({
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

            console.log({
                type: element,
                length: rules.length,
            })


            await this.aplyRule(rules, 1);
        }
    }

    async getContaAzulData(page, initialDate, finalDate) {
        // const data = await getSalesContaAzul(this.header, pages, 100, 50);
        const data = await getFinancialDataFromContaAzul(
            this.header, page, initialDate, finalDate, ['ATRASADO', 'EM_ABERTO'])

        return data
    }

    async init(pages) {
        try {
            this.page = pages;
            await this.GatheringDatabaseBillingRules();

        } catch (error) {
            console.log(error)
        }
    }

}



const chargingBillingRules = () => {

    ['PTB', 'Centro'].forEach(async unity => {

        try {

            const [token] = await Promise.all([getNewToken(unity)])

            const header = {
                "Authorization": `Bearer ${token}`
            }

            const startBilling = await new BillingRulesExec(
                header,
                unity,
            )

            console.time(`Process [bills]: ${unity}`);

            await startBilling.init(parseInt(1));

            console.timeEnd(`Process [bills]: ${unity}`);


            // 5 ptb
            // 6 centro

        } catch (error) {
            console.log({ error })
        }

    });
}
// chargingBillingRules()

export default chargingBillingRules