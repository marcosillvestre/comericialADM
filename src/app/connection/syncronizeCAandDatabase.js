import axios from "axios"
import prisma from "../../database/database.js"
import { Historic } from "../../database/historic/properties.js"
import { RegisterFinder } from "../../database/registers/register.find.js"
import { StringsMethods } from "../../utils/functions/serializerStrings.js"
import ordersController from "../controllers/internal/ordersController.js"
import { getToken } from "../core/getToken.js"
import { getAllSales, getSaleProducts } from "./externalConnections/contaAzulStrategy.js"
import { getContactsWithId } from "./externalConnections/rdStation.js"
import { CompleteCheckPointOnTrello, CreateCommentOnTrello } from "./externalConnections/trello.js"
import { SendGroupAlerts, SendSimpleWpp } from "./externalConnections/wpp.js"

const historic = new Historic()
const { spacesAndLowerCase } = new StringsMethods()
const { registerFinder, registerFindMany } = new RegisterFinder()


const routesRegister = {
    "parcela": "pagamentoPrimeiraParcelaStatus",
    "taxa de matricula": "taxaMatriculaStatus",
    "material didatico": "materialDidaticoStatus",

    "pagamentoPrimeiraParcelaStatus": "parcela",
    "taxaMatriculaStatus": "taxa de matricula",
    "materialDidaticoStatus": "material didatico",
}
const idList = {
    "Golfinho Azul": "PTB",
    'PTB': "PTB",
    'Centro': "Centro"
}


////////////////////////////////////////////////////////////

const parsed = (string) => {
    try {
        const match = string.match(/["']?serviço["']?:\s*(["']?)([^\n\r"']+)\1/i)
        const matchStudent = string.match(/["']?Aluno["']?:\s*(["']?)([^\n\r"']+)\1/i)
        const service = match ? match[2].trim() : null;
        const student = matchStudent ? matchStudent[2].trim() : null;

        return {
            service,
            student
        }

    } catch (error) {

        return "error aqui"
    }
}

class associationDatabaseAndCas {
    constructor({ unity, header, registers }) {
        this._sales = [];
        this.header = header;
        this.registers = registers;
        this.unity = unity;
    }

    async orderRegisterForDatabaseSales(idSale, name, material, unity, phone, student) {

        const { data } = await axios.get(
            "https://api.contaazul.com/v1/products?size=10000",
            { headers: this.header }
        )

        const body = material.map((res, index) => {
            let splited = res.split(" / ")

            const code = splited[1].replace(/(\r\n|\n|\r|\\[rn])/g, '')


            const pdFiltered = data.filter(res => res.code.includes(code))
            const id = idSale.concat(`-${index}`)

            if (pdFiltered.length > 0) return {
                id,
                sku: splited[1],
                name,
                phone,
                student,
                link: "",
                value: pdFiltered[0].value,
                removedBy: "",
                book: splited[0],
            }

        })
        /////analisar essa validação daqui 
        if (body.some(res => res ?? res)) await SendSimpleWpp(
            "marcos",
            process.env.MARCOS,
            `um desses materiais não foi encontrado :${material}`
        )

        return body.filter(res => res)

    }

    async EchoRegister(response, where, saleId) {

        let messages = {
            "materialDidaticoStatus": `> *${response.name}*
    
Realizou o pagamento do material didático
    
> ${response.customFields["Material didático"]}

Aluno: *${response.customFields["Nome do aluno (se não for responsável próprio))"] ?? response.name}*

Professor: *${response.customFields["Professor"]}*
`,


            "pagamentoPrimeiraParcelaStatus": `> *${response.name}*
            
Realizou o pagamento da primeira parcela do curso: *${response.customFields["Curso"]}*

Aluno: *${response.customFields["Nome do aluno (se não for responsável próprio))"] ?? response.name}*

Professor: *${response.customFields["Professor"]}*

`,


            "taxaMatriculaStatus": `> *${response.name}*
            
Realizou o pagamento da taxa de matrícula do curso: *${response.customFields["Curso"]}*

Aluno: *${response.customFields["Nome do aluno (se não for responsável próprio))"] ?? response.name}*

Professor: *${response.customFields["Professor"]}*

            `,
        }

        let chat = response.customFields["Unidade"] === "Centro" ?
            process.env.UMBLER_CHAT_PAYS_CENTRO :
            process.env.UMBLER_CHAT_PAYS_PTB

        await SendGroupAlerts(
            messages[where],
            chat
        )
        console.log({ where })

        if (where === "materialDidaticoStatus") {

            const rdPhoneData = await getContactsWithId(response.id)

            if (!(response.customFields["Material didático"]
                .find(r => r === "Outros" || r === "Office"))) {

                let bodyOrder = {
                    body: {
                        orders: await this.orderRegisterForDatabaseSales(
                            saleId,
                            response.name,
                            response.customFields["Material didático"],
                            response.customFields["Unidade"],
                            rdPhoneData?.phone,
                            response.customFields["Nome do aluno (se não for responsável próprio))"] ?? response.name
                        ),
                        unity: idList[response.customFields["Unidade"]]
                    }
                }
                await ordersController.storeMany(bodyOrder)

            }
        }

        let checkup = {
            "pagamentoPrimeiraParcelaStatus": "AUTOMÁTICO - Confirmação de pagamento da primeira mensalidade.",
            "taxaMatriculaStatus": "AUTOMÁTICO - Confirmação pagamento da taxa de matrícula (se houver)",
            "materialDidaticoStatus": "AUTOMÁTICO - Confirmação de pagamento do material didático."
        }


        let type = {
            "pagamentoPrimeiraParcelaStatus": response.customFields["Forma de pagamento da parcela"],
            "taxaMatriculaStatus": response.customFields["Forma de pagamento TM"],
            "materialDidaticoStatus": response.customFields["Forma de pagamento do MD"],
        }

        let trelloMessage = `${response.name} -- realizou o pagamento da(o) ${routesRegister[where]} via ${type[where]} no dia ${new Date().toLocaleDateString('pt-BR')}`

        Promise.all([
            CompleteCheckPointOnTrello([{ nome: response.name }], response.customFields["Unidade"], `ADM - Checkup inicial/${checkup[where]}`),
            CreateCommentOnTrello(response.name, response.customFields["Unidade"], trelloMessage)
        ])


    }



    async updateOnDatabaseRegister(params) {
        const date = new Date().toISOString()

        const registerDates = {
            "pagamentoPrimeiraParcelaStatus": "dataPagamentoPrimeiraParcela",
            "taxaMatriculaStatus": "dataPagamentoTaxaMatricula",
            "materialDidaticoStatus": "dataPagamentoMaterialDidatico",
        }
        const subtitle = {
            "taxaMatriculaStatus": "Status da taxa de matrícula",
            "pagamentoPrimeiraParcelaStatus": "Status do pagamento da primeira parcela",
            "materialDidaticoStatus": "Status do pagamento do material didático",
        }


        for (let index = 0; index < params.length; index++) {
            const element = params[index];

            const { userData, sales } = element;
            const keys = Object.keys(sales);

            const validating = await registerFinder(
                userData.id,
                {
                    AND: [
                        {
                            assinaturaContratoStatus: "Ok"
                        },
                        {
                            OR: [
                                {
                                    pagamentoPrimeiraParcelaStatus: {
                                        contains: "Ok",
                                        mode: "insensitive"
                                    },
                                },
                                {
                                    taxaMatriculaStatus: {
                                        contains: "Ok",
                                        mode: "insensitive"
                                    }
                                }
                            ]
                        }
                    ]
                }
            )

            console.log({ keys })

            keys.map(async (res) => {

                const where = routesRegister[res];
                const imutable = {
                    [where]: "Ok",
                    [registerDates[where]]: date,
                    historic: {
                        create: {
                            responsible: "Automação",
                            information: {
                                field: where,
                                text: `O campo ${subtitle[where]} foi alterado para Ok`,
                                from: userData.id,
                            }
                        }
                    }
                }
                const validated = {
                    ...imutable,
                    comissaoStatus: "Pré-aprovado"
                }

                await prisma.registers.update({
                    where: {
                        id: userData.id,
                    },
                    data: validating ?
                        validated :
                        imutable

                })
                    .then(async (response) => {
                        console.log(`${response.name} success / ${where} / ${response.customFields["Unidade"]}`)
                        await this.EchoRegister(response, where, sales[res].id)
                    })

            })
        }
    }

    async orderRegisterForContaAzulSales(sale, products) {
        const data = []

        if (!products) return

        const { id: idSale, customer } = sale

        const found = await prisma.registers.findFirst({
            where: {
                name: {
                    contains: customer.name,
                    mode: "insensitive"
                },
                materialDidaticoStatus: {
                    contains: "pendente",
                    mode: "insensitive"
                },
            }
        })

        if (found) {
            console.log("found: " + found.name)

            await prisma.registers.update({
                where: {
                    id: found.id
                },
                data: {
                    materialDidaticoStatus: "Ok",
                    historic: {
                        create: {
                            responsible: "Automação",
                            information: {
                                field: 'materialDidaticoStatus',
                                text: `O campo Status do pagamento do material didático foi alterado para Ok`,
                                from: found.id,
                            }
                        }
                    }
                }
            })
        }

        const { data: customerData } = await axios.
            get(`https://api.contaazul.com/v1/customers/${customer.id}/contacts`,
                { headers: this.header })


        for (let index = 0; index < products.length; index++) {
            const element = products[index];

            const body = {
                id: idSale.concat(`-${index}`),
                name: customer.name,
                sku: element.code,
                value: element.value,
                phone: customerData[0]?.business_phone || '',
                book: element.name.concat(" / ").concat(element.code),

                student: found?.customFields["Nome do aluno (se não for responsável próprio))"] ?? null,
                link: "",
                removedBy: "",
            }

            data.push(body)
        }


        let bodyOrder = {
            body: {
                orders: data,
                unity: this.unity
            }
        }

        if (data.length > 0) {
            console.log({
                where: "[orderRegisterForContaAzulSales]",
                message: "Venda sem observação enviada para o pedido de livros",
                for: data.map(d => d.name)
            })

            await ordersController.storeMany(bodyOrder)
        }

    }

    async filterAcquitedData(data) {
        const newData = [];

        for (let index = 0; index < data.length; index++) {
            const eachSale = data[index];

            const { notes, payment, customer, id } = eachSale;

            const products = await getSaleProducts(this.header, id)

            if (notes === "" && payment.method === "WITHOUT_PAYMENT") {
                this.orderRegisterForContaAzulSales(eachSale, products);
                continue
            }

            if (notes === "" && payment.installments[0]?.status === "ACQUITTED") {
                this.orderRegisterForContaAzulSales(eachSale, products);
                continue
            }

            const { service, student } = await parsed(notes)
            const { name, id: idCustomer } = customer;

            const deliverData = {
                id,
                student,
                customer: {
                    name: name.split(" -")[0],
                    id: idCustomer
                },
                service,
                payment: payment.installments[0] ?? payment.method,
                products
            }

            if (payment.method === "WITHOUT_PAYMENT" || payment.installments[0]?.status === "ACQUITTED") {
                newData.push(deliverData)
            }

        }
        console.log({ newData: newData.length })
        return await newData
    }

    async associateDatabaseAndSale(sales) {
        const data = [];

        for (const user of this.registers) {
            const salesUsers = await sales.filter(res => res.customer.name === user.name)

            if (salesUsers.length === 0) continue

            const foundedSales = {}

            for (const sale of salesUsers) {
                if (user.pendents.find(pd => pd === routesRegister[sale.service])) {
                    foundedSales[sale.service] = sale
                }
            }

            Object.keys(foundedSales).length > 0 &&
                data.push({
                    userData: user,
                    sales: foundedSales
                })
        }

        return await data;
    }

    async getDataContaAzulData(pages) {
        const data = await getAllSales(this.header, pages, 150, 60)

        return data
    }

    async init(pages) {
        try {
            const allSales = await this.getDataContaAzulData(pages)
            if (!allSales) throw new Error("Init data came as null");

            console.log({ pages })

            const { data, has_more } = allSales

            const acquittedData = await this.filterAcquitedData(data);
            const gathered = await this.associateDatabaseAndSale(acquittedData);


            gathered.length > 0 &&
                await this.updateOnDatabaseRegister(gathered);

            has_more && this.init(pages + 1);

            console.log("[DATABASE AND C.A. UPDATED]")

        } catch (error) {
            console.log(error)
        }
    }
}

async function reorganizeDatabaseData(unity) {

    const params = await registerFindMany({
        customFields: {
            path: ["Unidade"],
            string_contains: unity
        },
        OR: [
            {
                materialDidaticoStatus: {
                    contains: 'pendente',
                    mode: "insensitive"
                },
            },
            {
                pagamentoPrimeiraParcelaStatus: {
                    contains: 'pendente',
                    mode: "insensitive"

                }
            },
            {
                taxaMatriculaStatus: {
                    contains: 'pendente',
                    mode: "insensitive"
                }
            },
        ],
    },
        {
            select: {
                id: true,
                name: true,
                customFields: true,
                materialDidaticoStatus: true,
                pagamentoPrimeiraParcelaStatus: true,
                taxaMatriculaStatus: true,
            }
        },
    )

    const responses = params.map(register => {
        const {
            id, name, customFields, materialDidaticoStatus,
            pagamentoPrimeiraParcelaStatus, taxaMatriculaStatus
        } = register


        const pendentes = Object.keys(register)
            .filter(key =>
                register[key] === 'pendente' ||
                register[key] === "Pendente"
            );

        return {
            id,
            name,
            dataMatricula: customFields["Data de emissão da venda"],
            mdStatus: materialDidaticoStatus,
            ppStatus: pagamentoPrimeiraParcelaStatus,
            tmStatus: taxaMatriculaStatus,
            unidade: customFields["Unidade"],
            curso: customFields["Curso"],
            pendents: pendentes,
        }
    })


    return responses;
}


const SyncronizeSalesAndRegisters = async () => {

    ["PTB", "Centro"].forEach(async unity => {

        try {
            const token = await getToken(unity, 'refresh');
            const registers = await reorganizeDatabaseData(unity)

            const startBilling = new associationDatabaseAndCas({
                header: { "Authorization": `Bearer ${token}` },
                unity,
                registers
            })

            startBilling.init(0);

        } catch (error) {
            console.log(error)
        }

    });
}

export default SyncronizeSalesAndRegisters


// const o = await prisma.service.findMany()

// await axios.post(
//     "https://hook.us1.make.com/r53ooor6quxbs64zlxgzuyuiqe8mdvme",
//     { o }
// )


// let p = pd.slice(0, 5)

// console.log(p[0].priceSale + 10.20)
// console.log(p)
// p.map(async res => {

//     await prisma.Product.update({
//         where: {
//             id: res.id
//         },
//         data: {
//             priceSale: parseFloat(res.priceSale)
//         }
//     })
//         .then(r => r)
//         .catch(r => console.log(r))
// })


//     // let key = res.sku.startsWith('97') ? 'ean' : 'code'
//     // let sub = key === ean &&


//     // console.log(key)
// pd.map(async res => {

//     await prisma.Product.create({

//         data: {
//             ean: res.sku.startsWith('97') ? res.sku : null,
//             name: res.name,
//             priceSale: res.price_ticket,
//             code: res.sku,
//             unit: "UN"
//         }
//     })
//         .then(r => r)
//         .catch(r => console.log(r))


// })

