import axios from "axios"
import prisma from "../../database/database.js"
import { RegisterFinder } from "../../database/registers/register.find.js"
import ordersController from "../controllers/internal/ordersController.js"
import { getNewToken } from "../core/getToken.js"
import { customerShoppings, getFinancialDataFromContaAzul, getSaleItem } from "./externalConnections/contaAzulStrategy.js"
import { getContactsWithId } from "./externalConnections/rdStation.js"
import { CompleteCheckPointOnTrello, CreateCommentOnTrello } from "./externalConnections/trello.js"
import { SendGroupAlerts, SendSimpleWpp } from "./externalConnections/wpp.js"
import { ChecksumAlgorithm } from "@aws-sdk/client-s3"

const { registerFinder, registerFindMany } = new RegisterFinder()
const delay = ms => new Promise(res => setTimeout(res, ms));


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

// const parsed = (string) => {
//     try {
//         const match = string.match(/["']?serviço["']?:\s*(["']?)([^\n\r"']+)\1/i)
//         const matchStudent = string.match(/["']?Aluno["']?:\s*(["']?)([^\n\r"']+)\1/i)
//         const service = match ? match[2].trim() : null;
//         const student = matchStudent ? matchStudent[2].trim() : null;

//         return {
//             service,
//             student
//         }

//     } catch (error) {

//         return "error aqui"
//     }
// }

class associationDatabaseAndCas {
    constructor({ unity, header, registers }) {
        this._sales = [];
        this.header = header;
        this.registers = registers;
        this.unity = unity;
    }

    async orderRegisterForDatabaseSales(sale, userData) {

        const { customFields, phone, name } = userData;
        const body = [];

        for (const [index, res] of sale.entries()) {

            const query = new URLSearchParams({
                pagina: '1',
                tamanho_pagina: '10',
                busca: res.nome
            }).toString();

            const { data } = await axios.get(
                `https://api-v2.contaazul.com/v1/produtos?${query}`,
                { headers: this.header }
            );

            const { items: [product] } = data;

            if (!product) continue;


            const { codigo, nome: nameProduct } = product;

            body.push({
                id: res.id + '-' + index,
                sku: codigo || 'erro sku',
                name,
                phone,
                student: customFields["Nome do aluno (se não for responsável próprio))"] ?? name,
                link: "",
                value: res.valor,
                removedBy: "",
                book: nameProduct,
            });
        }


        /////analisar essa validação daqui 
        if (body.some(res => res)) await SendSimpleWpp(
            "marcos",
            process.env.MARCOS,
            `um desses materiais não foi encontrado`
        )

        return body

    }

    async EchoRegister(response, where, sale) {
        // console.log({ where, sale })

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

        1 > 2 && await SendGroupAlerts(
            messages[where],
            chat
        )


        if (where === "materialDidaticoStatus") {
            const { phone } = await getContactsWithId(response.id);

            let bodyOrder = {
                body: {
                    orders: await this.orderRegisterForDatabaseSales(
                        sale,
                        { ...response, phone }
                    ),
                    unity: idList[response.customFields["Unidade"]]
                }
            }

            await ordersController.storeMany(bodyOrder)


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

        console.log({ params: params.length })

        // const param = params.splice(0, 10)

        for (let index = 0; index < params.length; index++) {
            const element = params[index];

            const { userData, sales: sale } = element;
            console.time(`[sync]: search sales... ${userData.name}`);

            const [validating, purchases] = await Promise.all([
                registerFinder(
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
                ),
                customerShoppings(sale[0].cliente.id, this.header)
            ])
            await delay(7000);
            console.timeEnd(`[sync]: search sales... ${userData.name}`);

            if (!purchases) continue;
            const { data } = purchases;

            const filteredPaid = data.filter(res => res.condicao_pagamento === true);
            const filteredPaidProduct = filteredPaid.find(res => res.itens === 'PRODUCT');

            const imutable = {};

            if (filteredPaidProduct) imutable["pagamentoPrimeiraParcelaStatus"] = "Ok";

            const vistos = new Set();
            const keys = [];
            console.time(`[sync]: match sales... ${userData.name}`);

            for (const item of filteredPaid) {
                const saleItem = await getSaleItem(item.id, this.header);

                if (!saleItem || saleItem.length === 0) continue

                if (!vistos.has('taxa') && saleItem.find(r => r.nome === 'Taxa de Matrícula')) {
                    keys.push({ name: 'taxa de matricula', item: saleItem[0] })
                    vistos.add('taxa')
                    continue
                }

                if (!vistos.has('material') && saleItem.find(r => r.tipo === 'PRODUTO')) {
                    keys.push({ name: 'material didatico', item: saleItem })
                    vistos.add('material')
                    continue
                }
                if (!vistos.has('parcela')) {
                    keys.push({ name: 'parcela', item: saleItem[0] })
                    vistos.add('parcela')
                }
                await delay(7000);
            }
            console.timeEnd(`[sync]: match sales... ${userData.name}`);

            console.log({ keys })

            keys.map(async (res) => {

                const where = routesRegister[res.name];
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
                        await this.EchoRegister(response, where, res.item)
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


    async associateDatabaseAndSale(sales, database) {
        const data = [];

        for (const user of database) {
            const salesUsers = await sales.filter(res => res.cliente.nome === user.name)

            if (salesUsers.length === 0) continue;

            data.push({
                userData: user,
                sales: salesUsers
            })

        }

        return await data;
    }

    async getDataContaAzulData(page) {
        const initialDate = new Date()
        initialDate.setDate(initialDate.getDate() - 25)
        initialDate.setUTCHours(0, 0, 0, 0)

        const finalDate = new Date()
        finalDate.setDate(finalDate.getDate() + 30)
        finalDate.setUTCHours(23, 59, 59, 59)


        const data = await getFinancialDataFromContaAzul(
            this.header, page, initialDate, finalDate, 'RECEBIDO')

        return data
    }

    async init() {
        try {
            const allSales = await this.getDataContaAzulData(1)
            if (!allSales) throw new Error("Init data came as null");


            const { data, has_more, total } = allSales
            const gathered = await this.associateDatabaseAndSale(data, this.registers);

            gathered.length > 0 &&
                await this.updateOnDatabaseRegister(gathered);

            console.log("[DATABASE AND C.A. UPDATED]")
            return
            // has_more && this.init(pages + 1);

            return

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

    [
        "PTB",
        // "Centro"
    ].forEach(async unity => {

        try {
            // const token = await getToken(unity, 'refresh');
            const [token] = await Promise.all([getNewToken(unity)])

            const registers = await reorganizeDatabaseData(unity);

            const header = { "Authorization": `Bearer ${token}` }

            const startBilling = new associationDatabaseAndCas({
                header,
                unity,
                registers
            })


            console.time(`Process [sync]: ${unity}`);

            startBilling.init(0);

            console.timeEnd(`Process [sync]: ${unity}`);
        } catch (error) {
            console.log(error)
        }

    });
}


// SyncronizeSalesAndRegisters()

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

