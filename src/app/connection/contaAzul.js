import axios from "axios"
import { StringsMethods } from "../../config/serializerStrings.js"
import prisma from "../../database/database.js"
import { Historic } from "../../database/historic/properties.js"
import ordersController from "../controllers/internal/ordersController.js"
import { getToken } from "../core/getToken.js"
import { getAllSales, getSaleProducts } from "./externalConnections/contaAzulStrategy.js"
import { getContactsWithId } from "./externalConnections/rdStation.js"
import { CompleteCheckPointOnTrello, CreateCommentOnTrello } from "./externalConnections/trello.js"
import { SendGroupAlerts, SendSimpleWpp } from "./externalConnections/wpp.js"
const historic = new Historic()
const { spacesAndLowerCase } = new StringsMethods()



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



async function EchoRegister(response, where, saleId) {

    await historic._storeLog("Automatização", where, "Ok", response.id)

    let messages = {
        "materialDidaticoStatus": `> *${response.name}*
    
Realizou o pagamento do material didático
    
> ${response.customFields["Material didático"]}

Aluno: *${response.customFields["Nome do aluno"]}*

Professor: *${response.customFields["Professor"]}*
`,


        "pagamentoPrimeiraParcelaStatus": `> *${response.name}*
            
Realizou o pagamento da primeira parcela do curso: *${response.customFields["Curso"]}*

Aluno: *${response.customFields["Nome do aluno"]}*

Professor: *${response.customFields["Professor"]}*

`,


        "taxaMatriculaStatus": `> *${response.name}*
            
Realizou o pagamento da taxa de matrícula do curso: *${response.customFields["Curso"]}*

Aluno: *${response.customFields["Nome do aluno"]}*

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
                    orders: await orderRegisterForDatabaseSales(
                        saleId,
                        response.name,
                        response.customFields["Material didático"],
                        response.customFields["Unidade"],
                        rdPhoneData.phone,
                        response.customFields["Nome do aluno"]
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

async function updateOnDatabaseRegister(params) {
    const date = new Date().toISOString()

    const registerDates = {
        "pagamentoPrimeiraParcelaStatus": "dataPagamentoPrimeiraParcela",
        "taxaMatriculaStatus": "dataPagamentoTaxaMatricula",
        "materialDidaticoStatus": "dataPagamentoMaterialDidatico",
    }

    for (let index = 0; index < params.length; index++) {
        const element = params[index];

        const keys = Object.keys(element.sales)

        console.log(keys)

        keys.map(async (res) => {

            const where = routesRegister[res]

            await prisma.registers.update({
                where: {
                    id: element.userData.id
                },
                data: {
                    [where]: "Ok",
                    [registerDates[where]]: date,
                }
            })

                .then(async (response) => {
                    console.log(`${response.name} success / ${where} / ${response.customFields["Unidade"]}`)
                    await EchoRegister(response, where, element.sales[res].id)
                })

        })
    }

}

////provenientes do conta azul
const orderRegisterForContaAzulSales = async (sale, products, unity, headers) => {
    const data = []

    if (!products) return

    const found = await prisma.registers.findFirst({
        where: {
            name: {
                contains: sale.customer.name,
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
                materialDidaticoStatus: "Ok"
            }
        })
    }

    const { id: idSale, customer } = sale

    const { data: customerData } = await axios.get(`https://api.contaazul.com/v1/customers/${customer.id}/contacts`, { headers })


    for (let index = 0; index < products.length; index++) {
        const element = products[index];

        const body = {
            id: idSale.concat(`-${index}`),
            name: customer.name,
            sku: element.code,
            link: "",
            value: element.value,
            removedBy: "",
            phone: customerData[0]?.business_phone || '',
            book: element.name.concat(" / ").concat(element.code),
        }

        data.push(body)

    }


    let bodyOrder = {
        body: {
            orders: data,
            unity: idList[unity]
        }
    }

    data.length > 0 &&
        await ordersController.storeMany(bodyOrder)

}
////provenientes do banco de dados
const orderRegisterForDatabaseSales = async (idSale, name, material, unity, phone, student) => {

    const header = {
        "Authorization": `Bearer ${await getToken(unity)}`
    }

    const { data } = await axios.get("https://api.contaazul.com/v1/products?size=10000", { headers: header })

    const body = material.map((res, index) => {
        let splited = res.split(" / ")


        const pdFiltered = data.filter(res => res.code.includes(splited[1]))
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

const filterAcquitedData = async (header, data, unity) => {
    const newData = [];

    for (let index = 0; index < data.length; index++) {
        const eachSale = data[index];

        const { notes, payment, customer, id } = eachSale;

        const products = await getSaleProducts(header, id)

        if (notes === "" && payment.method === "WITHOUT_PAYMENT") {

            orderRegisterForContaAzulSales(eachSale, products, unity, header)
            continue
        }

        if (notes === "" &&
            payment.installments[0] ||
            payment.installments[0]?.status === "ACQUITTED") {

            orderRegisterForContaAzulSales(eachSale, products, unity, header)
            continue
        }


        let parsed = () => {
            try {
                const match = notes.match(/["']?serviço["']?:\s*(["']?)([^\n\r"']+)\1/i)
                const service = match ? match[2].trim() : null;

                return {
                    service
                }

            } catch (error) {

                return "error aqui"
            }
        }

        //////////////////////// aqui que ta o jogo 



        let { service, rdId } = await parsed()

        if (payment.method === "WITHOUT_PAYMENT" ||
            payment.installments[0] &&
            payment.installments[0].status === "ACQUITTED") {
            newData.push({
                id,
                customer,
                service,
                payment: payment.installments[0] ?? payment.method,
                products
            })

        }



    }

    return newData
}


const deliverData = async (header, page) => {

    let allSales = await getAllSales(header, page, 90, 10)

    return allSales;
}

async function gatheringSaleAndProducts(unity, page) {
    try {
        const header = {
            "Authorization": `Bearer ${await getToken(unity, page === 0 && 'refresh')}`
        }


        let { data, has_more } = await deliverData(header, page)
        const acquittedData = [];


        const filteredData = await filterAcquitedData(header, data, unity)


        acquittedData.concat(filteredData)

        if (has_more) await gatheringSaleAndProducts(unity, page + 1)

        return acquittedData
    } catch (error) {
        console.log(error)

        return []
    }

}


async function associationDatabaseAndCa(params) {
    const { database, sales } = params
    const data = [];

    for (const user of database) {
        const salesUsers = await sales.filter(res => res.customer.name === user.name)
        if (salesUsers.length === 0) continue


        const foundedSales = {}

        for (const sale of salesUsers) {
            if (user.pendents.find(pd => pd === routesRegister[sale.service])) {
                foundedSales[sale.service] = sale
            }
        }

        data.push({
            userData: user,
            sales: foundedSales
        })
    }



    return await data
}




async function reorganizingDatabaseData(params) {
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


    return responses

}

async function SearchPendentsRegister(unity) {

    await prisma.registers.findMany({
        where: {
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
        }
    })

        .then(async response => {

            console.log(`[${response.length} PENDINGS]`)


            const databaseSynchronizedWithContaAzul = await associationDatabaseAndCa({
                database: await reorganizingDatabaseData(response),
                sales: await gatheringSaleAndProducts(unity, 0)
            })

            console.log(`${databaseSynchronizedWithContaAzul.length} sales sinc`)

            await updateOnDatabaseRegister(databaseSynchronizedWithContaAzul)
            console.log("Atualizado")

        })

}



const syncContaAzulRegister = async () => {

    for (const realToken of [
        "PTB",
        "Centro"
    ]) {
        console.log(`[PAYMENTS CA UPDATES: ${realToken}]`)

        await Promise.all([
            SearchPendentsRegister(realToken),

        ])

    }
}


export default syncContaAzulRegister
/*

await prisma.orders.create({
    data: {
        unity: "centro",
        id: data.id,
        sku: data.sku,
        name: data.nome,
        value: data.valor,
        student: data.aluno,
        phone: data.tel,
        book: data.materialDidatico,
        link: "",
        removedBy: "",
    }
})
    .then(r => console.log(r))
    .catch(r => console.log(r))


await prisma.books.findMany({
    include: {
        orderRelated: true
    }
})
    .then(async r => {

        for (let index = 0; index < r.length; index++) {
            const res = r[index];


            const dates = (d) => {

                if (!d) return ''

                const [date, _] = d.split(", ")
                const [day, m, y] = date.split("/")
                const rm = date && new Date(y, m, day)

                return rm
            }

            const w = {
                id: res.id,
                phone: res.tel,
                student: res.aluno,
                sku: res.sku,
                link: res.link,
                name: res.nome,
                value: res.valor,
                arrived: res.chegada,
                signed: res.assinado,
                status: "REVISAR",
                removedBy: res.retiradoPor,
                withdraw: dates(res.dataRetirada),
                book: res.materialDidatico,
                unity: res.orderRelated.unity,
                created_at: DateTransformer(res.data)
            }

            const wt = {
                id: res.id,
                phone: res.tel,
                student: res.aluno,
                sku: res.sku,
                link: res.link,
                name: res.nome,
                value: res.valor,
                arrived: res.chegada,
                signed: res.assinado,
                status: "REVISAR",
                removedBy: res.retiradoPor,
                book: res.materialDidatico,
                unity: res.orderRelated.unity,
                created_at: DateTransformer(res.data)

            }
            try {

                await prisma.orders.create({
                    data: dates(res.dataRetirada) ? w : wt
                }).then(res => console.log(res.name))
            } catch (error) {
                continue
            }


        }
    })



async function deletadorDeLivrosDuplicados(params) {

    await prisma.books.findMany()
        .then(res => {

            res.map(async r => {
                await prisma.books.findMany({
                    where: {
                        AND: [
                            {
                                id: {
                                    not: r.id
                                },
                            },
                            {
                                sku: r.sku
                            },
                            {
                                materialDidatico: r.materialDidatico,
                            },
                            {
                                nome: r.nome
                            }
                        ]
                    }
                })
                    .then(async find => {
                        // console.log(find)
                        if (find.length > 0) {

                            find.map(async finded => {

                                await prisma.books.delete({
                                    where: {
                                        id: finded.id
                                    }
                                })
                                    .then((t) => console.log(t))
                                    .then((err) => console.log(err))
                            })

                        }
                    })



            })
        })
}
deletadorDeLivrosDuplicados()

/*
    // async function deletadorDeInsumosDuplicados(params) {

    //     await prisma.insume.findMany()
    //         .then(res => {
    //             res.map(async r => {
    //                 await prisma.insume.findFirst({
    //                     where: {
    //                         id: {
    //                             not: r.id
    //                         },
    //                         name: r.name,
    //                         sku: r.sku,
    //                         color: r.color
    //                     }
    //                 })
    //                     .then(async find => {
    //                         // console.log(find)
    //                         if (find) {

    //                             await prisma.insume.delete({
    //                                 where: {
    //                                     id: find.id
    //                                 }
    //                             })
    //                                 .then(() => console.log("deletado"))
    //                                 .catch((err) => console.log(err))

    //                         }
    //                     })



    //             })
    //         })
    // }
    */



// const t = {
//     "id": "Mzh8ZWM1MjUzNTItMWU0YS00YTVkLTg3MmEtNmZlZmUzODgwMWI4",
//     "object": "webhook",
//     "name": "StageTests",
//     "format": "json",
//     "url": "https://hook.us1.make.com/r76itv1j78x8qdis4w1ou3bbuggil55e",
//     "event": {
//         "id": "ec525352-1e4a-4a5d-872a-6fefe38801b8",
//         "object": "event",
//         "organization": 3219431,
//         "type": "signature.accepted",
//         "data": {
//             "public_id": "33be7c3a-e24c-11ef-9465-42010a2b610e",
//             "object": "signature",
//             "user": {
//                 "name": "marcos vinicius silvestre de oliveira",
//                 "company": null,
//                 "email": "marcos.vinicius7170@gmail.com",
//                 "phone": null,
//                 "cpf": "02180933657",
//                 "birthday": "2002-06-27"
//             },
//             "document": "33b11f55a12c2e1a93ffa76fc78eeb5b158126e253ca2c97c",
//             "action": "Sign",
//             "viewed": "2025-02-03T16:43:56.000000Z",
//             "signed": "2025-02-03T16:43:56.000000Z",
//             "rejected": null,
//             "reason": null,
//             "biometric_unapproved": null,
//             "biometric_approved": null,
//             "biometric_rejected": null,
//             "created_at": "2025-02-03T16:30:38.000000Z"
//         },
//         "previous_attributes": [],
//         "created_at": "2025-02-03T16:43:56.553675Z"
//     }
// }

