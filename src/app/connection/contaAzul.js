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
    
> ${response.customFields["Material didático"]}`,


        "pagamentoPrimeiraParcelaStatus": `> *${response.name}*
            
Realizou o pagamento da primeira parcela do curso`,


        "taxaMatriculaStatus": `> *${response.name}*
            
Realizou o pagamento da taxa de matrícula
            `,
    }

    let chat = response.customFields["Unidade"] === "Centro" ?
        process.env.UMBLER_CHAT_PAYS_CENTRO :
        process.env.UMBLER_CHAT_PAYS_PTB

    await SendGroupAlerts(
        messages[where],
        chat
    )

    if (where === "materialDidaticoStatus") {

        const rdPhoneData = await getContactsWithId(response.id)

        if (!(response.customFields["Material didático"].find(r => r === "Outros" || r === "Office"))) {

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
            await ordersController.store(bodyOrder)

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
const orderRegisterForContaAzulSales = async (sale, products, unity) => {
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
            customFields: {
                path: ["Material didático"],
                array_contains: products.name.concat(" / ").concat(products.code)
            }
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

    for (let index = 0; index < products.length; index++) {
        const element = products[index];

        const { id: idSale, customer } = sale

        if (element.itemType !== 'PRODUCT') continue

        const body = {
            id: idSale.concat(`-${index}`),
            sku: element.code,
            materialDidatico: element.name,
            nome: customer.name,
            valor: element.value,
            data: new Date().toLocaleDateString("pt-BR"),
            type: "manual",
            assinado: false,
            retiradoPor: "",
            dataRetirada: "",
            link: "",
        }

        data.push(body)

    }

    let bodyOrder = {
        body: {
            orders: data,
            unity: idList[unity]
        }
    }

    await ordersController.store(bodyOrder)

}
////provenientes do banco de dados
const orderRegisterForDatabaseSales = async (idSale, name, material, unity, tel, aluno) => {

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
            nome: name,
            materialDidatico: splited[0],
            valor: pdFiltered[0].value,
            data: new Date().toLocaleDateString("pt-BR"),
            assinado: false,
            dataRetirada: "",
            link: "",
            retiradoPor: "",
            aluno,
            tel,
            type: "auto"
        }

    })
    /////analisar essa validação daqui 
    if (body.some(res => res === null || res === undefined)) await SendSimpleWpp("marcos", process.env.MARCOS, `um desses materiais não foi encontrado :${material}`)
    return body.filter(res => res)

}

//esse cara vai substituir o getSalesByCustomerId
async function gatheringSaleAndProducts(unity) {
    try {

        const header = {
            "Authorization": `Bearer ${await getToken(unity, 'refresh')}`
        }

        let allSales = await getAllSales(header)

        console.log(allSales.length + " allSales")

        const data = [];

        for (let index = 0; index < allSales.length; index++) {
            const eachSale = allSales[index];

            const { notes, payment, customer, id } = eachSale;

            const products = await getSaleProducts(header, id)


            if (notes === "" &&
                payment.installments[0] &&
                payment.installments[0]?.status === "ACQUITTED"
            ) {
                orderRegisterForContaAzulSales(eachSale, products, unity)
                continue
            }


            let parsed = () => {
                try {

                    let cleanData = notes.replace(/\\n/g, "")
                    cleanData.replace(/(\s+|[^:{}\[\],]+(?=:)|:([^"]|$))/g, '')

                    const json = JSON.parse(cleanData)
                    return {
                        service: json["serviço"],
                        rdId: json["id"]
                    }
                } catch (error) {

                    return "error aqui"
                }
            }

            let { service, rdId } = await parsed()

            if (payment.installments[0] &&
                payment.installments[0].status === "ACQUITTED") data.push({
                    id,
                    // rdId,
                    customer,
                    service,
                    payment: payment.installments[0],
                    products
                })

        }

        return await data


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
            .filter(key => register[key] === 'pendente' || register[key] === "Pendente");

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
                sales: await gatheringSaleAndProducts(unity)
            })


            console.log(await databaseSynchronizedWithContaAzul.length + " sales sinc")

            await updateOnDatabaseRegister(databaseSynchronizedWithContaAzul)
            console.log("Atualizado")

        })

}



const syncContaAzulRegister = async () => {
    console.log("Payments ca updates")

    for (const realToken of ["PTB", "Centro"]) {

        await Promise.all([
            SearchPendentsRegister(realToken),

        ])

    }
}

export default syncContaAzulRegister
/*
async function deletadorDeLivrosDuplicados(params) {

    await prisma.books.findMany()
        .then(res => {
            res.map(async r => {
                await prisma.books.findFirst({
                    where: {
                        id: {
                            not: r.id
                        },
                        aluno: r.aluno,
                        materialDidatico: r.materialDidatico,
                        nome: r.nome
                    }
                })
                    .then(async find => {
                        // console.log(find)
                        if (find) {

                            await prisma.books.delete({
                                where: {
                                    id: find.id
                                }
                            })
                                .then((r) => console.log(r))
                                .then((err) => console.log(err))

                        }
                    })



            })
        })
}
deletadorDeLivrosDuplicados()
*/
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


/*
// const t = [
//     {
//         "id": "f8f2871c-d08c-404f-ae6d-277b5ad258bd",
//         "sku": "9780357502105",
//         "tel": "31987946495",
//         "data": "24/10/2024",
//         "link": "https://assina.ae/opxDdndQs9PnFxfM8",
//         "nome": "Antonio Andre Servio ",
//         "aluno": "Nathan Henrique de Siqueira Servio",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "01/11/2024, 18:41:15",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "c4c1c68f-93f6-4380-9b12-662b0938dc76",
//         "sku": "IN1WB5AP",
//         "tel": "(31) 999198702",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/gC5fppkPw318Habu6",
//         "nome": "Alberony Sergio dos Santos",
//         "aluno": "Gabriel Andrade dos Santos\t",
//         "valor": 27.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 1 - WB - 5th Ed - AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "61311a19-5041-4055-9e95-1ff733608dad",
//         "sku": "SCA1PK1AP",
//         "tel": "3599090218",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/Z3uJBK7jCn9pQkXb7",
//         "nome": "Wallex Batista de Souza Andrade",
//         "aluno": "Wallex Batista de Souza Andrade",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "04/11/2024, 19:56:00",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "b32b405d-d919-4092-89f3-a1553e558af4",
//         "sku": "9781009040419",
//         "tel": "3599090218",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/Z3uJBK7jCn9pQkXb7",
//         "nome": "Wallex Batista de Souza Andrade",
//         "aluno": "Wallex Batista de Souza Andrade",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "04/11/2024, 19:56:12",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "65acd917-99da-4774-ad8e-08ff3a283ddc",
//         "sku": "WLIWB3AP",
//         "tel": "31983000737",
//         "data": "25/10/2024",
//         "link": "",
//         "nome": "Maristela Dias Rodrigues Andrade",
//         "aluno": "Daniel Francisco Dias Andrade",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "08/11/2024, 16:03:52",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "b5c3ec1a-10bc-4182-9d03-d51f13b3435c",
//         "sku": "SCA1PK1AP",
//         "tel": "31983000737",
//         "data": "25/10/2024",
//         "link": "",
//         "nome": "Maristela Dias Rodrigues Andrade",
//         "aluno": "Daniel Francisco Dias Andrade",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "08/11/2024, 16:04:03",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "e96dcf16-4ec0-4d3c-baea-a9121f693f7b",
//         "sku": "9781009040440",
//         "tel": "(31) 999198702",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/gC5fppkPw318Habu6",
//         "nome": "Alberony Sergio dos Santos",
//         "aluno": "Gabriel Andrade dos Santos",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 1 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "045b50b7-7ca4-4940-a6f8-3470261dcc5c",
//         "sku": "SCA1PK1AP",
//         "tel": "553197327690",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/dafYc2bXnUBrNHR19",
//         "nome": "Milena Ribeiro de Melo",
//         "aluno": "Milena Ribeiro de Melo",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "08/11/2024, 17:51:36",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "8e33ee01-99e3-486d-8e9d-12e9cbf817d6",
//         "sku": "BWIWB1AP",
//         "tel": "3599090218",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/Z3uJBK7jCn9pQkXb7",
//         "nome": "Wallex Batista de Souza Andrade",
//         "aluno": "Wallex Batista de Souza Andrade",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "08/11/2024, 17:50:48",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "5547494b-af16-44e7-986e-42c92217d7b3",
//         "sku": "BWIWB1AP",
//         "tel": "553197327690",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/dafYc2bXnUBrNHR19",
//         "nome": "Milena Ribeiro de Melo",
//         "aluno": "Milena Ribeiro de Melo",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "28/10/2024, 19:15:01",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "5ce94049-671c-42bd-bcf7-765ded061e59",
//         "sku": "SCA1PK1AP",
//         "tel": "31987946495",
//         "data": "24/10/2024",
//         "link": "https://assina.ae/opxDdndQs9PnFxfM8",
//         "nome": "Antonio Andre Servio ",
//         "aluno": "Nathan Henrique de Siqueira Servio",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "01/11/2024, 18:41:02",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "312ab593-5347-4805-92a1-e0a7b317239d",
//         "sku": "9781009040419",
//         "tel": "553197327690",
//         "data": "25/10/2024",
//         "link": "https://assina.ae/dafYc2bXnUBrNHR19",
//         "nome": "Milena Ribeiro de Melo",
//         "aluno": "Milena Ribeiro de Melo",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "08/11/2024, 17:51:24",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "169dccac-517f-4976-b472-8933ae9e7f44",
//         "sku": "WL1SB4BK",
//         "tel": "+553194603758",
//         "data": "10/10/2024",
//         "link": "https://assina.ae/BGJgjWBrGbykcjDG9",
//         "nome": "Nubia Cristina Pereira de Souza",
//         "aluno": "Maria Eduarda Souza Brito",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "19/10/2024, 10:04:54",
//         "materialDidatico": "World Link 1 - SB - 4TH ED - BK",
//         "type": "auto",
//         "orderId": "6d07495b-901e-4e6f-b4ff-77e408fe7408"
//     },
//     {
//         "id": "66e5932e-f08e-46eb-b56b-d01746058572",
//         "sku": "WL1WB4AP",
//         "tel": "+553194603758",
//         "data": "10/10/2024",
//         "link": "https://assina.ae/BGJgjWBrGbykcjDG9",
//         "nome": "Nubia Cristina Pereira de Souza",
//         "aluno": "Maria Eduarda Souza Brito",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "08/11/2024, 18:06:08",
//         "materialDidatico": "World Link 1 - WB - 4TH ED - AP",
//         "type": "auto",
//         "orderId": "6d07495b-901e-4e6f-b4ff-77e408fe7408"
//     },
//     {
//         "id": "2a72525c",
//         "sku": "VBAWB1AP",
//         "tel": "",
//         "data": "24/12/2024",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "",
//         "valor": 41.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - WB - 1st Ed - AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "7e972065",
//         "sku": "SCEPK1BK",
//         "tel": "",
//         "data": "24/12/2024",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "",
//         "valor": 12.34,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Espanhol - PK - 1st Ed - AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "25b26714-6908-4462-9f6c-f9fda01433b7",
//         "sku": "SH2WB1BK",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/JN6NXTr8GBdfaWiN9",
//         "nome": "Geusiane dos Santos Bissaro",
//         "aluno": "",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "dfbf8eec",
//         "sku": "BWIWB1AP",
//         "tel": "",
//         "data": "24/12/2024",
//         "link": "",
//         "nome": "Juliana Mara Mendes Serinoli",
//         "aluno": "",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "b3f4be4f-6d55-40e9-afff-4a4691741ffa",
//         "sku": "9780357502105",
//         "tel": "31983000737",
//         "data": "25/10/2024",
//         "link": "",
//         "nome": "Maristela Dias Rodrigues Andrade",
//         "aluno": "Daniel Francisco Dias Andrade",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "08/11/2024, 16:03:39",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "67ad59c8-19ff-40af-ab83-b6e4e5b01a7b",
//         "sku": "WLIWB3AP",
//         "tel": "31987946495",
//         "data": "24/10/2024",
//         "link": "https://assina.ae/opxDdndQs9PnFxfM8",
//         "nome": "Antonio Andre Servio ",
//         "aluno": "Nathan Henrique de Siqueira Servio",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "01/11/2024, 18:41:31",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "auto",
//         "orderId": "7ad4825b-9ec7-456a-92a7-47605125d404"
//     },
//     {
//         "id": "60427dc0",
//         "sku": "SCA1PK1AP",
//         "tel": "",
//         "data": "24/12/2024",
//         "link": "",
//         "nome": "Juliana Mara Mendes Serinoli",
//         "aluno": "",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "ff193c73-a552-4117-82d7-4cba08abc42b",
//         "sku": "SCA1PK1AP",
//         "tel": "5531994054505",
//         "data": "03/10/2024",
//         "link": "",
//         "nome": "Regina da Silva Reis",
//         "aluno": "Lucas Barbosa Reis",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "12764b27-628a-4b69-abcf-0820306e6445"
//     },
//     {
//         "id": "d997e129-93e2-4574-ad14-c7184120e2e9",
//         "sku": "SH2SB1BK",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/JN6NXTr8GBdfaWiN9",
//         "nome": "Geusiane dos Santos Bissaro",
//         "aluno": "",
//         "valor": 210,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "14/10/2024, 14:57:56",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "915ce1ff-fe30-4e76-9aa3-21f99c165157",
//         "sku": "IN3WB5AP",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/y2xz5Q2Q4CTgpwy77",
//         "nome": "Eliene do Carmo de Paula",
//         "aluno": "",
//         "valor": 27.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "02/10/2024, 16:44:22",
//         "materialDidatico": "Interchange 3 - WB - 5th Ed - AP",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "2fb41161-5a39-4290-8425-2e31cad3166e",
//         "sku": "IN3SB5BK",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/y2xz5Q2Q4CTgpwy77",
//         "nome": "Eliene do Carmo de Paula",
//         "aluno": "",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 3 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "658cbaca-d2a8-460b-88bd-c99a0263164e",
//         "sku": "SH2WB1BK",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/SFLCPneVRJfVm4CP9",
//         "nome": "Janete Pereira de Farias -",
//         "aluno": "",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "4409eb18-0883-42b8-ad0d-7e08e91ffbba",
//         "sku": "SH2SB1BK",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/SFLCPneVRJfVm4CP9",
//         "nome": "Janete Pereira de Farias -",
//         "aluno": "",
//         "valor": 210,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "10bb9214-37a5-4cb8-b886-c68454b6b839",
//         "sku": "IN3SB5BK",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/dxaMkDVQT7E8W3QN9",
//         "nome": "Rone Glesse Batista de Souza",
//         "aluno": "",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "14/10/2024, 14:56:40",
//         "materialDidatico": "Interchange 3 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "d05c12ff",
//         "sku": "9788419065230",
//         "tel": "",
//         "data": "10/12/2024",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "",
//         "valor": 355.74,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - SB - 1st Ed - BK",
//         "type": "manual",
//         "orderId": "e4fa146d-678b-4e6b-82cc-a8c375d7d0d8"
//     },
//     {
//         "id": "f58c3693",
//         "sku": "9788419065230",
//         "tel": "",
//         "data": "24/12/2024",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "",
//         "valor": 355.74,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - SB - 1st Ed - BK",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "d397d551-649c-411a-866a-43828c610820",
//         "sku": "IN3WB5AP",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/dxaMkDVQT7E8W3QN9",
//         "nome": "Rone Glesse Batista de Souza",
//         "aluno": "",
//         "valor": 27.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 3 - WB - 5th Ed - AP",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "4560ebdd",
//         "sku": "BWIWB1AP",
//         "tel": "",
//         "data": "12/11/2024",
//         "link": "",
//         "nome": "Priscila da Silva Chaves ",
//         "aluno": "",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "a763c844",
//         "sku": "9781009040525",
//         "tel": "31993036552",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Rone Glesse Batista de Souza",
//         "aluno": "Evelyn Carolline Santana de Souza",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:42:39",
//         "materialDidatico": "Interchange 3 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "8bc6f05a",
//         "sku": "WLIWB3AP",
//         "tel": "31996411941",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Dirlene Gonçalves Soares Pereira",
//         "aluno": "Paula Gonçalves Soares Pereira ",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP / WLIWB3AP",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "635067c0",
//         "sku": "SCA1PK1AP",
//         "tel": "31992612307",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Adriana Gabriela Santana ",
//         "aluno": "Larissa Santana Zanchet",
//         "valor": 17.56,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 14:13:54",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "b064b71d",
//         "sku": "9780357502105",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Edileia Rocha Pereira de Souza ",
//         "aluno": "",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "cfde5781",
//         "sku": "BWIWB1AP",
//         "tel": "31989078957",
//         "data": "28/12/2024",
//         "link": "",
//         "nome": "Priscila da Silva Chaves ",
//         "aluno": "Priscila Da Silva Chaves",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "79ddf441",
//         "sku": "IN2WB5AP",
//         "tel": "",
//         "data": "09/12/2024",
//         "link": "",
//         "nome": "Adelmo Aparecido da Silva",
//         "aluno": "",
//         "valor": 27.45,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 2 - WB - 5th Ed - AP",
//         "type": "manual",
//         "orderId": "f9f982fe-f58b-4de9-86ab-fd1f6fc18a43"
//     },
//     {
//         "id": "e95e4ef9",
//         "sku": "SCA1PK1AP",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Edna Ferreira Cesar",
//         "aluno": "",
//         "valor": 17.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "7d924522-ad99-4d57-891e-9cdbc1d091bf",
//         "sku": "9781292441580",
//         "tel": "3199784734",
//         "data": "07/11/2024",
//         "link": "https://assina.ae/77aHcrR9tQc5L9vW7",
//         "nome": "Stefanne Amanda da Silva Souza Moreira",
//         "aluno": "Geovanna Stefanne Moreira",
//         "valor": 210,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "11/11/2024, 19:24:39",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "bab876c3",
//         "sku": "9780357502143",
//         "tel": "",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Danielle da Silva Oliveira",
//         "aluno": "",
//         "valor": 237.67,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:37:33",
//         "materialDidatico": "World Link 1 - SB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "96079613",
//         "sku": "SCA1PK1AP",
//         "tel": "31996411941",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Dirlene Gonçalves Soares Pereira",
//         "aluno": "Paula Gonçalves Soares Pereira ",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "150c5f93",
//         "sku": "9786557702567",
//         "tel": "998115285",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Nibia Mara de Oliveira Lopes",
//         "aluno": "Mariana Oliveira Matos",
//         "valor": 186.67,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "14/11/2024, 14:56:01",
//         "materialDidatico": "Dream Kids 2 - PK - 3rd Ed - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "887ea792",
//         "sku": "9780357502105",
//         "tel": "+5531989561578",
//         "data": "31/12/2024",
//         "link": "",
//         "nome": "Zenith Gomes do Rego",
//         "aluno": "Daniele Victoria Gomes da Silva",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "0e8b3966-9ffd-49fc-945c-e7b16d75ee98"
//     },
//     {
//         "id": "f10bc27b-1f1f-4674-a755-411ed23659f4",
//         "sku": "9780357502105",
//         "tel": "+553183281629",
//         "data": "06/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Silva",
//         "aluno": "Júlia Rafaela Silva Do Vale",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "auto",
//         "orderId": "eacaa514-2e67-4644-ba5c-dec5bdd2c9dc"
//     },
//     {
//         "id": "0bd8aa60",
//         "sku": "9781292441665",
//         "tel": "",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Patricia Cristina de Sousa Januzzi",
//         "aluno": "",
//         "valor": 114.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "Victor",
//         "dataRetirada": "15/01/2025, 19:03:26",
//         "materialDidatico": "Stars and Heroes 4 - WB - 1 st Ed - BK / SH4WB1BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "b4722691",
//         "sku": "WLIWB3AP",
//         "tel": "985028835",
//         "data": "09/12/2024",
//         "link": "",
//         "nome": "Catia da Silva Romao",
//         "aluno": "João Vitor da Silva Romão",
//         "valor": 23.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "manual",
//         "orderId": "f9f982fe-f58b-4de9-86ab-fd1f6fc18a43"
//     },
//     {
//         "id": "cfd22d7d",
//         "sku": "WLIWB3AP",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Edna Ferreira Cesar",
//         "aluno": "",
//         "valor": 23.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "0cce5de7-08e9-4c74-9dfc-ac9d21c3dc23",
//         "sku": "IN2WB5AP",
//         "tel": "",
//         "data": "24/09/2024",
//         "link": "https://assina.ae/x7vVBDQvHJpj8z5L6",
//         "nome": "Thiago Tito Ferreira ",
//         "aluno": "",
//         "valor": 27.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 2 - WB - 5th Ed - AP",
//         "type": "auto",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "5f1bd23a",
//         "sku": "9780357502105",
//         "tel": "5531994054505",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Regina da Silva Reis",
//         "aluno": "Lucas Barbosa Reis",
//         "valor": 237.67,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "375bcf62",
//         "sku": "9781292441641",
//         "tel": "31 8381-1200",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Samantha Camila Santos Guerra",
//         "aluno": "Jean Carlos Bonifacio dos Santos",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:33:35",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "5fb1da11",
//         "sku": "WLIWB3AP",
//         "tel": "31985620503",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Maria Braga de Souza",
//         "aluno": "Breno Vinicius Braga de Souza",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP / WLIWB3AP",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "7666847c",
//         "sku": "SCEPK1BK",
//         "tel": "",
//         "data": "10/12/2024",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "",
//         "valor": 12.34,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Espanhol - PK - 1st Ed - AP",
//         "type": "manual",
//         "orderId": "e4fa146d-678b-4e6b-82cc-a8c375d7d0d8"
//     },
//     {
//         "id": "1bd8ac8b",
//         "sku": "SCA1PK1AP",
//         "tel": "+5531989561578",
//         "data": "31/12/2024",
//         "link": "",
//         "nome": "Zenith Gomes do Rego",
//         "aluno": "Daniele Victoria Gomes da Silva",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "0e8b3966-9ffd-49fc-945c-e7b16d75ee98"
//     },
//     {
//         "id": "3a68aa3b",
//         "sku": "IN3WB5AP",
//         "tel": "31989896638",
//         "data": "09/12/2024",
//         "link": "",
//         "nome": "Fatima Ribeiro Silvestre da Costa",
//         "aluno": "Joyce Silvestre Alves",
//         "valor": 27.45,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 3 - WB - 5th Ed - AP",
//         "type": "manual",
//         "orderId": "f9f982fe-f58b-4de9-86ab-fd1f6fc18a43"
//     },
//     {
//         "id": "d68c84bc",
//         "sku": "9781292441580",
//         "tel": "3196671351",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Eva Patricia Soares Gomes",
//         "aluno": "Rafael Gomes Duraes",
//         "valor": 210,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "5706bd4e",
//         "sku": "9781292441672",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Ana Claudia Lopes da Silva",
//         "aluno": "",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "d58a66ff-8c05-4a56-b837-37e14a6a5e85",
//         "sku": "INISB5BK",
//         "tel": "31973375058",
//         "data": "06/09/2024",
//         "link": "https://assina.ae/mvtjrzHJsBFP3kQq8",
//         "nome": "Iris Vitoria dos Santos Braga",
//         "aluno": "",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "Victor",
//         "dataRetirada": "03/10/2024, 13:42:57",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "af7f5eff-f945-46fc-910f-8fead69cf338"
//     },
//     {
//         "id": "ece162ce-c9d5-479e-b7af-8f076616bca3",
//         "sku": "IN2SB5BK",
//         "tel": "",
//         "data": "24/09/2024",
//         "link": "https://assina.ae/x7vVBDQvHJpj8z5L6",
//         "nome": "Thiago Tito Ferreira ",
//         "aluno": "",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "11/10/2024, 19:11:47",
//         "materialDidatico": "Interchange 2 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "ca419cfc",
//         "sku": "9781009040440",
//         "tel": "(31) 99856-1551",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Elaine da Silva Viana",
//         "aluno": "Eric Davy Viana Silva",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:44:22",
//         "materialDidatico": "Interchange 1 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "eadd86c8",
//         "sku": "9780357502105",
//         "tel": "31985620503",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Maria Braga de Souza",
//         "aluno": "Breno Vinicius Braga de Souza",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK / WLISB4BK",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "9bf19975-067a-4c02-b165-7c62e1263c52",
//         "sku": "DK2PK3BK",
//         "tel": "",
//         "data": "23/09/2024",
//         "link": "https://assina.ae/EwQTtwKgYoP1gbZp8",
//         "nome": "Nibia Mara de Oliveira Lopes",
//         "aluno": "",
//         "valor": 186.67,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "15/10/2024, 14:43:50",
//         "materialDidatico": "Dream Kids 2 - PK - 3rd Ed - BK",
//         "type": "manual",
//         "orderId": "7a99b715-9d51-433c-a46d-3595f8837dda"
//     },
//     {
//         "id": "2bb23a08",
//         "sku": "BWIWB1AP",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Juliana Mara Mendes Serinoli",
//         "aluno": "",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "7384f334",
//         "sku": "9780357502105",
//         "tel": "+553183281629",
//         "data": "07/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Silva",
//         "aluno": "Júlia Rafaela Silva Do Vale",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK / WLISB4BK",
//         "type": "manual",
//         "orderId": "eacaa514-2e67-4644-ba5c-dec5bdd2c9dc"
//     },
//     {
//         "id": "97b914f7",
//         "sku": "BWIWB1AP",
//         "tel": "3193969415",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Thiago de Cristo Rodrigues de Souza",
//         "aluno": "Tiago de Cristo Rodrigues de Souza",
//         "valor": 16.78,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "8ce3fba4-f0d1-4733-b66c-7f158801b63f",
//         "sku": "9781292441672",
//         "tel": "3199784734",
//         "data": "07/11/2024",
//         "link": "https://assina.ae/77aHcrR9tQc5L9vW7",
//         "nome": "Stefanne Amanda da Silva Souza Moreira",
//         "aluno": "Geovanna Stefanne Moreira",
//         "valor": 114.45,
//         "chegada": false,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "11/11/2024, 19:24:48",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "0b61519d",
//         "sku": "9781292441573",
//         "tel": "31 8381-1200",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Samantha Camila Santos Guerra",
//         "aluno": "Jean Carlos Bonifacio dos Santos",
//         "valor": 210,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:33:47",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "0097bb29",
//         "sku": "9781292441573",
//         "tel": "",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Nilma Martins de Souza Alves",
//         "aluno": "",
//         "valor": 210,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:50:58",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "d44472e8",
//         "sku": "SCA1PK1AP",
//         "tel": "",
//         "data": "12/11/2024",
//         "link": "",
//         "nome": "Priscila da Silva Chaves ",
//         "aluno": "",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "c6c987ee",
//         "sku": "9780357502105",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Edna Ferreira Cesar",
//         "aluno": "",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "97e58be0-2566-4cf5-85a9-b91b3c853935",
//         "sku": "WLIWB3AP",
//         "tel": "+553183281629",
//         "data": "06/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Silva",
//         "aluno": "Júlia Rafaela Silva Do Vale",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "auto",
//         "orderId": "eacaa514-2e67-4644-ba5c-dec5bdd2c9dc"
//     },
//     {
//         "id": "7ceeb292",
//         "sku": "SCA1PK1AP",
//         "tel": "985028835",
//         "data": "09/12/2024",
//         "link": "",
//         "nome": "Catia da Silva Romao",
//         "aluno": "João Vitor da Silva Romão",
//         "valor": 17.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "f9f982fe-f58b-4de9-86ab-fd1f6fc18a43"
//     },
//     {
//         "id": "1dfd70d1",
//         "sku": "9781009040419",
//         "tel": "3193969415",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Thiago de Cristo Rodrigues de Souza",
//         "aluno": "Tiago de Cristo Rodrigues de Souza",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "98237d95",
//         "sku": "BWIWB1AP",
//         "tel": "31998017551",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Lidiane Silva da Conceiçao",
//         "aluno": "Lidiane Silva da Conceiçao ",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "f6b8b838",
//         "sku": "WLIWB3AP",
//         "tel": "31992612307",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Adriana Gabriela Santana ",
//         "aluno": "Larissa Santana Zanchet",
//         "valor": 23.56,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 14:13:27",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "74f74f01",
//         "sku": "IN1WB5AP",
//         "tel": "(31) 99856-1551",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Elaine da Silva Viana",
//         "aluno": "Eric Davy Viana Silva",
//         "valor": 27.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:44:34",
//         "materialDidatico": "Interchange 1 - WB - 5th Ed - AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "b32cee93",
//         "sku": "9780357502105",
//         "tel": "31996497018",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Celio Araujo da Silva",
//         "aluno": "Leticia Araujo Pereira ",
//         "valor": 237.67,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK / WLISB4BK",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "7fd5be2d",
//         "sku": "9780357502105",
//         "tel": "985028835",
//         "data": "09/12/2024",
//         "link": "",
//         "nome": "Catia da Silva Romao",
//         "aluno": "João Vitor da Silva Romão",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "f9f982fe-f58b-4de9-86ab-fd1f6fc18a43"
//     },
//     {
//         "id": "c63726f0",
//         "sku": "9781292441580",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Ana Claudia Lopes da Silva",
//         "aluno": "",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "31e4be26",
//         "sku": "SCA1PK1AP",
//         "tel": "+553183281629",
//         "data": "07/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Silva",
//         "aluno": "Júlia Rafaela Silva Do Vale",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "eacaa514-2e67-4644-ba5c-dec5bdd2c9dc"
//     },
//     {
//         "id": "c7393fa4",
//         "sku": "9781292441672",
//         "tel": "3196671351",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Eva Patricia Soares Gomes",
//         "aluno": "Rafael Gomes Duraes",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "e02baa9b",
//         "sku": "SCA1PK1AP",
//         "tel": "31998017551",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Lidiane Silva da Conceiçao",
//         "aluno": "Lidiane Silva da Conceiçao ",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "8ece841a",
//         "sku": "9780357502105",
//         "tel": "31992612307",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Adriana Gabriela Santana ",
//         "aluno": "Larissa Santana Zanchet",
//         "valor": 237.67,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 14:13:37",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "20d23196",
//         "sku": "9781292441641",
//         "tel": "",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Nilma Martins de Souza Alves",
//         "aluno": "",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:51:06",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "64ca29f4",
//         "sku": "VBAWB1AP",
//         "tel": "",
//         "data": "10/12/2024",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "",
//         "valor": 41.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - WB - 1st Ed - AP",
//         "type": "manual",
//         "orderId": "e4fa146d-678b-4e6b-82cc-a8c375d7d0d8"
//     },
//     {
//         "id": "22a15660",
//         "sku": "SCA1PK1AP",
//         "tel": "31989078957",
//         "data": "28/12/2024",
//         "link": "",
//         "nome": "Priscila da Silva Chaves ",
//         "aluno": "Priscila Da Silva Chaves",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "7236f17a-e22d-4333-af10-13d5ff61abc9",
//         "sku": "SCA1PK1AP",
//         "tel": "+553183281629",
//         "data": "06/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Silva",
//         "aluno": "Júlia Rafaela Silva Do Vale",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "eacaa514-2e67-4644-ba5c-dec5bdd2c9dc"
//     },
//     {
//         "id": "67d9eedb",
//         "sku": "9781009040525",
//         "tel": "31989896638",
//         "data": "09/12/2024",
//         "link": "",
//         "nome": "Fatima Ribeiro Silvestre da Costa",
//         "aluno": "Joyce Silvestre Alves",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 3 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "f9f982fe-f58b-4de9-86ab-fd1f6fc18a43"
//     },
//     {
//         "id": "1aca6014",
//         "sku": "WLIWB3AP",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Edileia Rocha Pereira de Souza ",
//         "aluno": "",
//         "valor": 23.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "9f6791f5",
//         "sku": "9781009040419",
//         "tel": "31998017551",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Lidiane Silva da Conceiçao",
//         "aluno": "Lidiane Silva da Conceiçao ",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK / INISB5BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "5cfc1602",
//         "sku": "WLIWB3AP",
//         "tel": "31996497018",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Celio Araujo da Silva",
//         "aluno": "Leticia Araujo Pereira ",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP / WLIWB3AP",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "c49afe04",
//         "sku": "WLIWB3AP",
//         "tel": "5531994054505",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Regina da Silva Reis",
//         "aluno": "Lucas Barbosa Reis",
//         "valor": 23.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "d7258016",
//         "sku": "IN3WB5AP",
//         "tel": "31993036552",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Rone Glesse Batista de Souza",
//         "aluno": "Evelyn Carolline Santana de Souza",
//         "valor": 27.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:42:31",
//         "materialDidatico": "Interchange 3 - WB - 5th Ed - AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "c9fbadd7",
//         "sku": "WLIWB3AP",
//         "tel": "+5531989561578",
//         "data": "31/12/2024",
//         "link": "",
//         "nome": "Zenith Gomes do Rego",
//         "aluno": "Daniele Victoria Gomes da Silva",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "manual",
//         "orderId": "0e8b3966-9ffd-49fc-945c-e7b16d75ee98"
//     },
//     {
//         "id": "08210c2d",
//         "sku": "9781009040495",
//         "tel": "",
//         "data": "09/12/2024",
//         "link": "",
//         "nome": "Adelmo Aparecido da Silva",
//         "aluno": "",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 2 - W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "f9f982fe-f58b-4de9-86ab-fd1f6fc18a43"
//     },
//     {
//         "id": "99f5d868",
//         "sku": "SCA1PK1AP",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Edileia Rocha Pereira de Souza ",
//         "aluno": "",
//         "valor": 17.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "67e41369",
//         "sku": "9781292441729",
//         "tel": "",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Patricia Cristina de Sousa Januzzi",
//         "aluno": "",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 4 - SB - 1 st Ed - BK / SH4SB1BK",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "4b98e27c",
//         "sku": "WL1WB4AP",
//         "tel": "",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Danielle da Silva Oliveira",
//         "aluno": "",
//         "valor": 23.56,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "rucianne",
//         "dataRetirada": "16/11/2024, 13:37:50",
//         "materialDidatico": "World Link 1 - WB - 4TH ED - AP",
//         "type": "manual",
//         "orderId": "8e84ea83-0c5f-4acf-ba2a-39ac74bad43e"
//     },
//     {
//         "id": "0ab07852",
//         "sku": "9780357502105",
//         "tel": "31996411941",
//         "data": "11/11/2024",
//         "link": "",
//         "nome": "Dirlene Gonçalves Soares Pereira",
//         "aluno": "Paula Gonçalves Soares Pereira ",
//         "valor": 237.67,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK / WLISB4BK",
//         "type": "manual",
//         "orderId": "aa2f9eae-2116-4836-87b7-6ada6cd122af"
//     },
//     {
//         "id": "04fe11c4",
//         "sku": "9788416782932",
//         "tel": "",
//         "data": "12/11/2024",
//         "link": "",
//         "nome": "kailany teste",
//         "aluno": "",
//         "valor": 300.57,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina B1 -  SB - 1st Ed - BK",
//         "type": "manual",
//         "orderId": "502d8979-4da2-4044-b342-1113f5b8d5cf"
//     },
//     {
//         "id": "88c8086b",
//         "sku": "SCA1PK1AP",
//         "tel": "",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Juliana Mara Mendes Serinoli",
//         "aluno": "",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "d5671aa3-486b-46b1-8a8e-cbe6ae4aed8a"
//     },
//     {
//         "id": "7085c35d",
//         "sku": "WLIWB3AP",
//         "tel": "+553183281629",
//         "data": "07/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Silva",
//         "aluno": "Júlia Rafaela Silva Do Vale",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP / WLIWB3AP",
//         "type": "manual",
//         "orderId": "eacaa514-2e67-4644-ba5c-dec5bdd2c9dc"
//     },
//     {
//         "id": "b200bf9c-0bc1-47b7-b424-3c3a5dcd2efc",
//         "sku": "SCA1PK1AP",
//         "tel": "11957930080",
//         "data": "09/01/2025",
//         "link": "",
//         "nome": " Cristiane Aparecida de Oliveira Félix",
//         "aluno": "Rayane de Oliveira Felix",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "b8ededf3-d967-4f5f-bb7d-559d6627ef85"
//     },
//     {
//         "id": "3b0daa0c-0222-4fae-9aa6-81450b2fcc0c",
//         "sku": "WL1WB4AP",
//         "tel": "11957930080",
//         "data": "09/01/2025",
//         "link": "",
//         "nome": " Cristiane Aparecida de Oliveira Félix",
//         "aluno": "Rayane de Oliveira Felix",
//         "valor": 23.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link 1 - WB - 4TH ED - AP",
//         "type": "auto",
//         "orderId": "b8ededf3-d967-4f5f-bb7d-559d6627ef85"
//     },
//     {
//         "id": "4605c70a",
//         "sku": "9781292441580",
//         "tel": "",
//         "data": "11/01/2025",
//         "link": "",
//         "nome": "Magno Vinicius da Silva",
//         "aluno": "",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "b8ededf3-d967-4f5f-bb7d-559d6627ef85"
//     },
//     {
//         "id": "778a9445",
//         "sku": "9781292441672",
//         "tel": "",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Lopes da Silva",
//         "aluno": "",
//         "valor": 114.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "325f217a",
//         "sku": "9781292441580",
//         "tel": "",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Lopes da Silva",
//         "aluno": "",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "2d657e53",
//         "sku": "9781292441580",
//         "tel": "3196671351",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Eva Patricia Soares Gomes",
//         "aluno": "Rafael Gomes Duraes",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "0417266c",
//         "sku": "9781292441672",
//         "tel": "3196671351",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Eva Patricia Soares Gomes",
//         "aluno": "Rafael Gomes Duraes",
//         "valor": 114.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "03014132",
//         "sku": "9781292441573",
//         "tel": "31998460471",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Leonardo Januzzi da Silva",
//         "aluno": "Mariana Sousa Januzzi",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK / SH2SB1BK",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "f74dca02",
//         "sku": "9781292441641",
//         "tel": "31998460471",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Leonardo Januzzi da Silva",
//         "aluno": "Mariana Sousa Januzzi",
//         "valor": 114.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK / SH2WB1BK",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "d0325f63-36f1-4561-9424-00811b54ab80",
//         "sku": "9781292441580",
//         "tel": "31991579618",
//         "data": "14/01/2025",
//         "link": "",
//         "nome": "Larissa Rodrigues dos Santos",
//         "aluno": "Nycollas Bryan Rodrigues da Silva",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "fc16d347-a282-4375-8f98-9de99a11b872",
//         "sku": "9781292441672",
//         "tel": "31991579618",
//         "data": "14/01/2025",
//         "link": "",
//         "nome": "Larissa Rodrigues dos Santos",
//         "aluno": "Nycollas Bryan Rodrigues da Silva",
//         "valor": 114.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "92df75ab-eac9-45bd-a2e8-cee16b3064f5",
//         "sku": "9781292441702",
//         "tel": "(31) 99108-1229",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Ediane Nara Soares Chaves",
//         "aluno": "Pedro Henrique Soares Chaves",
//         "valor": 210,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 3 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "f90831d4-bf62-4461-9eb3-35fcb4e597fe",
//         "sku": "9781292441658",
//         "tel": "(31) 99108-1229",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Ediane Nara Soares Chaves",
//         "aluno": "Pedro Henrique Soares Chaves",
//         "valor": 114.45,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 3 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "111ac287-308a-4c55-b0a9-593bd8a8e31e",
//         "sku": "SCA1PK1AP",
//         "tel": "31996900780",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Andre Tiago Vaz de Melo",
//         "aluno": "Rafaella Fraga De Assis Vaz de Melo",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "92efd8f0-1992-4fb4-b346-01e6d86f401e",
//         "sku": "9781009040419",
//         "tel": "31996900780",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Andre Tiago Vaz de Melo",
//         "aluno": "Rafaella Fraga De Assis Vaz de Melo",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "b6be6d98-4311-433a-9982-a48d2a36304b",
//         "sku": "BWIWB1AP",
//         "tel": "31996900780",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Andre Tiago Vaz de Melo",
//         "aluno": "Rafaella Fraga De Assis Vaz de Melo",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "63c4fbd8",
//         "sku": "9781292441672",
//         "tel": "",
//         "data": "11/01/2025",
//         "link": "",
//         "nome": "Magno Vinicius da Silva",
//         "aluno": "",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "b8ededf3-d967-4f5f-bb7d-559d6627ef85"
//     },
//     {
//         "id": "60118c17",
//         "sku": "SCA1PK1AP",
//         "tel": "31996900780",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Andre Tiago Vaz de Melo",
//         "aluno": "Rafaella Fraga De Assis Vaz de Melo",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "47d92533",
//         "sku": "BWIWB1AP",
//         "tel": "31996900780",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Andre Tiago Vaz de Melo",
//         "aluno": "Rafaella Fraga De Assis Vaz de Melo",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "63aac6da",
//         "sku": "9781009040419",
//         "tel": "31996900780",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Andre Tiago Vaz de Melo",
//         "aluno": "Rafaella Fraga De Assis Vaz de Melo",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK / INISB5BK",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "d5994d55",
//         "sku": "SCA1PK1AP",
//         "tel": "3193969415",
//         "data": "23/12/2024",
//         "link": "",
//         "nome": "Thiago de Cristo Rodrigues de Souza",
//         "aluno": "Tiago de Cristo Rodrigues de Souza",
//         "valor": 17.56,
//         "chegada": true,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "7fb561da-deaf-4942-bc62-8a9888df2eb0"
//     },
//     {
//         "id": "f904de82",
//         "sku": "9781009040419",
//         "tel": "31991266081",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Karine Stefane Pereira Silva",
//         "aluno": "Karine Stefane Pereira Silva",
//         "valor": 356.87,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "Iury",
//         "dataRetirada": "21/01/2025, 15:06:59",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "38ed740e-2642-48a6-aa5e-4c78a7fc74dd",
//         "sku": "9781292441672",
//         "tel": "31982596323",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Cristiane Aparecida R Teixeira Marques",
//         "aluno": "Sara Rodrigues Marques",
//         "valor": 114.45,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "Jaqueline",
//         "dataRetirada": "17/01/2025, 11:19:52",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "3b0332aa-797b-4f00-a529-5106a16884c2",
//         "sku": "9781292441580",
//         "tel": "31982596323",
//         "data": "13/01/2025",
//         "link": "",
//         "nome": "Cristiane Aparecida R Teixeira Marques",
//         "aluno": "Sara Rodrigues Marques",
//         "valor": 210,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "Jaqueline",
//         "dataRetirada": "17/01/2025, 11:20:03",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "cbb8aadc-bf0c-48fc-b486-6d0a5128c56c",
//         "sku": "SCA1PK1AP",
//         "tel": "31993882700",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Nathan Alexandre Salviano da Almeida",
//         "aluno": "Nathan Alexandre Salviano de Almeida",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "34db8c88-31b0-4fe4-8ec9-d1477ded12f3",
//         "sku": "BWIWB1AP",
//         "tel": "31993882700",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Nathan Alexandre Salviano da Almeida",
//         "aluno": "Nathan Alexandre Salviano de Almeida",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "b91efaf4",
//         "sku": "SCA1PK1AP",
//         "tel": "31993882700",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Nathan Alexandre Salviano da Almeida",
//         "aluno": "Nathan Alexandre Salviano de Almeida",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "d1e3194b",
//         "sku": "BWIWB1AP",
//         "tel": "31993882700",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Nathan Alexandre Salviano da Almeida",
//         "aluno": "Nathan Alexandre Salviano de Almeida",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "50f0077d",
//         "sku": "SCA1PK1AP",
//         "tel": "31993882700",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Nathan Alexandre Salviano da Almeida",
//         "aluno": "Nathan Alexandre Salviano de Almeida",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "9869cea1",
//         "sku": "BWIWB1AP",
//         "tel": "31993882700",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Nathan Alexandre Salviano da Almeida",
//         "aluno": "Nathan Alexandre Salviano de Almeida",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "5c659213-9ded-4291-b584-07742c302c8e",
//         "sku": "SCA1PK1AP",
//         "tel": "3192745132",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Cleber Wilian Mariano",
//         "aluno": "Cleber Wilian Mariano",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "65fb97b8-d56a-4e20-9931-be06e9d98206",
//         "sku": "9781009040419",
//         "tel": "3192745132",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Cleber Wilian Mariano",
//         "aluno": "Cleber Wilian Mariano",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "74fbee3a-2c30-49cc-8ac4-00150c08b130",
//         "sku": "BWIWB1AP",
//         "tel": "3192745132",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Cleber Wilian Mariano",
//         "aluno": "Cleber Wilian Mariano",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "93080105",
//         "sku": "SCA1PK1AP",
//         "tel": "3192745132",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Cleber Wilian Mariano",
//         "aluno": "Cleber Wilian Mariano",
//         "valor": 17.56,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "c71bf14d",
//         "sku": "BWIWB1AP",
//         "tel": "3192745132",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Cleber Wilian Mariano",
//         "aluno": "Cleber Wilian Mariano",
//         "valor": 16.78,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "45b097c9",
//         "sku": "9781009040419",
//         "tel": "3192745132",
//         "data": "17/01/2025",
//         "link": "",
//         "nome": "Cleber Wilian Mariano",
//         "aluno": "Cleber Wilian Mariano",
//         "valor": 356.87,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK / INISB5BK",
//         "type": "manual",
//         "orderId": "a79d8ca2-21f7-4724-9f99-398ed6650d09"
//     },
//     {
//         "id": "b5c55938",
//         "sku": "9781292441597",
//         "tel": "",
//         "data": "18/01/2025",
//         "link": "",
//         "nome": "Flávia Soares Gomes",
//         "aluno": "",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "4cd8a4ff",
//         "sku": "9781292441696",
//         "tel": "",
//         "data": "18/01/2025",
//         "link": "",
//         "nome": "Flávia Soares Gomes",
//         "aluno": "",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "c83a162d-8ac8-4db2-ae97-83f205f011b6",
//         "sku": "9781292441702",
//         "tel": "(31) 99690-9873",
//         "data": "18/01/2025",
//         "link": "",
//         "nome": "Eurita Fernandes Teixeira",
//         "aluno": "Nicole Fernandes Coelho",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 3 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "db693d1c-f19b-4509-81a0-e94ebc2ca8c9",
//         "sku": "9781292441658",
//         "tel": "(31) 99690-9873",
//         "data": "18/01/2025",
//         "link": "",
//         "nome": "Eurita Fernandes Teixeira",
//         "aluno": "Nicole Fernandes Coelho",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 3 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "b621d290-ff69-42bc-ad07-0a4520d1b412",
//         "sku": "9788419065230",
//         "tel": "31992923619",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "Kaique Fernando de Lima",
//         "valor": 401,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - SB - 1st Ed - BK",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "87d2cd60-ff3b-46ae-a3f1-2fd273b1ea0d",
//         "sku": "VBAWB1AP",
//         "tel": "31992923619",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "Kaique Fernando de Lima",
//         "valor": 47,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - WB - 1st Ed - AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "dd43b681-d219-49d3-a6e9-c1d9feead3e0",
//         "sku": "SCEPK1BK",
//         "tel": "31992923619",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "Kaique Fernando de Lima",
//         "valor": 14,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Espanhol - PK - 1st Ed - AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "505065d3-71be-4775-b05b-4a7536ddcd7f",
//         "sku": "9788419065230",
//         "tel": "31992923619",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "Kaique Fernando de Lima",
//         "valor": 401,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - SB - 1st Ed - BK",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "581744e5-57d5-4af7-9ed2-b93445d613ff",
//         "sku": "VBAWB1AP",
//         "tel": "31992923619",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "Kaique Fernando de Lima",
//         "valor": 47,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Vitamina Básico (A1-A2) - WB - 1st Ed - AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "e40a2494-13fa-485a-9a0f-2298ad68a6c1",
//         "sku": "SCEPK1BK",
//         "tel": "31992923619",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Kaique Fernando de Lima",
//         "aluno": "Kaique Fernando de Lima",
//         "valor": 14,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Espanhol - PK - 1st Ed - AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "0f2c1a56",
//         "sku": "9781292441597",
//         "tel": "31991579618",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Larissa Rodrigues dos Santos",
//         "aluno": "Nycollas Bryan Rodrigues da Silva",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "e636e474",
//         "sku": "9781292441696",
//         "tel": "31991579618",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Larissa Rodrigues dos Santos",
//         "aluno": "Nycollas Bryan Rodrigues da Silva",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "308542b0",
//         "sku": "9781292441573",
//         "tel": "(31) 99108-1229",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Ediane Nara Soares Chaves",
//         "aluno": "Pedro Henrique Soares Chaves",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "d39f5e58",
//         "sku": "9781292441641",
//         "tel": "(31) 99108-1229",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Ediane Nara Soares Chaves",
//         "aluno": "Pedro Henrique Soares Chaves",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "8a0c1a71",
//         "sku": "9781292441597",
//         "tel": "31982596323",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Cristiane Aparecida R Teixeira Marques",
//         "aluno": "Sara Rodrigues Marques",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "d8f7fd9b",
//         "sku": "9781292441696",
//         "tel": "31982596323",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Cristiane Aparecida R Teixeira Marques",
//         "aluno": "Sara Rodrigues Marques",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "f1fd0b68",
//         "sku": "SCA1PK1AP",
//         "tel": "3193969415",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Thiago de Cristo Rodrigues de Souza",
//         "aluno": "Tiago de Cristo Rodrigues de Souza",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "0eba7616",
//         "sku": "9780357504062",
//         "tel": "3193969415",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Thiago de Cristo Rodrigues de Souza",
//         "aluno": "Tiago de Cristo Rodrigues de Souza",
//         "valor": 150,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link 4 - WB - 4TH ED - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "6fa6b98c",
//         "sku": "9781009040419",
//         "tel": "3193969415",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Thiago de Cristo Rodrigues de Souza",
//         "aluno": "Tiago de Cristo Rodrigues de Souza",
//         "valor": 409,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "224dc361-9cff-4007-bcda-154d31055595",
//         "sku": "9781292441672",
//         "tel": "3175006020",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Lopes da Silva",
//         "aluno": "Emanuel Ricciardo da Silva Soares",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "a2377e76-9f8c-47e9-a842-739810427ec6",
//         "sku": "9781292441580",
//         "tel": "3175006020",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Ana Claudia Lopes da Silva",
//         "aluno": "Emanuel Ricciardo da Silva Soares",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "1678af0e-568e-47d4-8e76-3956400d9156",
//         "sku": "SCA1PK1AP",
//         "tel": "31996704456",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Edna Ferreira Cesar",
//         "aluno": "Gustavo Henrique Cesar Faria",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "3b9b7cdb-9cd4-40fd-991d-7e4e357fc037",
//         "sku": "9780357502105",
//         "tel": "31996704456",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Edna Ferreira Cesar",
//         "aluno": "Gustavo Henrique Cesar Faria",
//         "valor": 284,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "cefe49c3-82b0-410b-a8b9-b3b2b042e332",
//         "sku": "WLIWB3AP",
//         "tel": "31996704456",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Edna Ferreira Cesar",
//         "aluno": "Gustavo Henrique Cesar Faria",
//         "valor": 27,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "539d652b-4a90-443d-9f80-570b5365892a",
//         "sku": "9781292441580",
//         "tel": "3184888751",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Magno Vinicius da Silva",
//         "aluno": "Cecilia Luiza de Andrade Silva",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "3bba668e-4aef-4872-96bc-b65dc48b0199",
//         "sku": "9781292441672",
//         "tel": "3184888751",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Magno Vinicius da Silva",
//         "aluno": "Cecilia Luiza de Andrade Silva",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "f29d7f35-3f29-4285-b993-4cb1e1e632bf",
//         "sku": "9780357502105",
//         "tel": "3193536534",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Edileia Rocha Pereira de Souza ",
//         "aluno": "Guilherme Rocha de Souza",
//         "valor": 284,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - SB - 4TH ED - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "f23fc66e-b1db-4616-909a-495fbf8c2a25",
//         "sku": "WLIWB3AP",
//         "tel": "3193536534",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Edileia Rocha Pereira de Souza ",
//         "aluno": "Guilherme Rocha de Souza",
//         "valor": 27,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "World Link Intro - WB - 3TH ED - AP",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "87590d60-147e-45dd-85ac-f4f99b65dbaa",
//         "sku": "SCA1PK1AP",
//         "tel": "3193536534",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Edileia Rocha Pereira de Souza ",
//         "aluno": "Guilherme Rocha de Souza",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "fa749ad9",
//         "sku": "9781292441597",
//         "tel": "3184888751",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Magno Vinicius da Silva",
//         "aluno": "Cecilia Luiza de Andrade Silva",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - SB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "365f00be",
//         "sku": "9781292441696",
//         "tel": "3184888751",
//         "data": "20/01/2025",
//         "link": "",
//         "nome": "Magno Vinicius da Silva",
//         "aluno": "Cecilia Luiza de Andrade Silva",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes Starter - WB - 1 st Ed - BK",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "99d68e70-fa57-41bc-b0b9-6b6ddc4e8e5b",
//         "sku": "SCA1PK1AP",
//         "tel": "553191212052",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Givanildo Sousa",
//         "aluno": "Ana Caroline Ramos Costa",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "fd8b7071-a7a4-4a00-a7f2-98d9462de86b",
//         "sku": "BWIWB1AP",
//         "tel": "553191212052",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Givanildo Sousa",
//         "aluno": "Ana Caroline Ramos Costa",
//         "valor": 19,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "deba7435",
//         "sku": "SCA1PK1AP",
//         "tel": "553191212052",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Givanildo Sousa",
//         "aluno": "Ana Caroline Ramos Costa",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "c11a05bb",
//         "sku": "BWIWB1AP",
//         "tel": "553191212052",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Givanildo Sousa",
//         "aluno": "Ana Caroline Ramos Costa",
//         "valor": 19,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "4e42b8d7-4eb6-4db9-a54e-e7bf43cb2953",
//         "sku": "9781292441580",
//         "tel": "31981194486",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Rayza Cristina Souza Costa",
//         "aluno": "Bryan Sousa Xavier",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "075a7402-829a-46ca-8416-cb2c03f99450",
//         "sku": "9781292441672",
//         "tel": "31981194486",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Rayza Cristina Souza Costa",
//         "aluno": "Bryan Sousa Xavier",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 1 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "b1f91c54-42ba-45b7-8a29-5e3a1c88dfea",
//         "sku": "SCA1PK1AP",
//         "tel": "31 9692-5590",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Nathanael Gomes da Silva",
//         "aluno": "Nathanael Gomes da Silva",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "3aacd682-e6b3-4281-85e5-4d8b4cef1c21",
//         "sku": "9781009040419",
//         "tel": "31 9692-5590",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Nathanael Gomes da Silva",
//         "aluno": "Nathanael Gomes da Silva",
//         "valor": 409,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "dd90a30b-2cb6-4b67-8c88-da1d81e7a6ee",
//         "sku": "BWIWB1AP",
//         "tel": "31 9692-5590",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Nathanael Gomes da Silva",
//         "aluno": "Nathanael Gomes da Silva",
//         "valor": 19,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "de843bf7-1549-4c07-b544-6fd520cea933",
//         "sku": "9781292441573",
//         "tel": "31994773784",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Ceci Vicencia de Almeida Melo",
//         "aluno": "Kaua Victor Oliveira de Almeida",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "9baf491f-ab96-4395-bb44-76a24b175e12",
//         "sku": "9781292441641",
//         "tel": "31994773784",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Ceci Vicencia de Almeida Melo",
//         "aluno": "Kaua Victor Oliveira de Almeida",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "c9722c03",
//         "sku": "9781292441573",
//         "tel": "31994773784",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Ceci Vicencia de Almeida Melo",
//         "aluno": "Kaua Victor Oliveira de Almeida",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK / SH2SB1BK",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "9e923c01",
//         "sku": "9781292441641",
//         "tel": "31994773784",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Ceci Vicencia de Almeida Melo",
//         "aluno": "Kaua Victor Oliveira de Almeida",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK / SH2WB1BK",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "3404ef19",
//         "sku": "9781292441573",
//         "tel": "31994773784",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Ceci Vicencia de Almeida Melo",
//         "aluno": "Kaua Victor Oliveira de Almeida",
//         "valor": 255,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - SB - 1 st Ed - BK / SH2SB1BK",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "417f024a",
//         "sku": "9781292441641",
//         "tel": "31994773784",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Ceci Vicencia de Almeida Melo",
//         "aluno": "Kaua Victor Oliveira de Almeida",
//         "valor": 139,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Stars and Heroes 2 - WB - 1 st Ed - BK / SH2WB1BK",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "dc24bca1",
//         "sku": "SCA1PK1AP",
//         "tel": "31991266081",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Karine Stefane Pereira Silva",
//         "aluno": "Karine Stefane Pereira Silva",
//         "valor": 17.56,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "Iury",
//         "dataRetirada": "21/01/2025, 15:06:38",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "0a1b850c",
//         "sku": "BWIWB1AP",
//         "tel": "31991266081",
//         "data": "15/01/2025",
//         "link": "",
//         "nome": "Karine Stefane Pereira Silva",
//         "aluno": "Karine Stefane Pereira Silva",
//         "valor": 16.78,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "Iury",
//         "dataRetirada": "21/01/2025, 15:06:49",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "0e5829c7-a8e4-45da-a9f7-21092d1a168f"
//     },
//     {
//         "id": "e737b31c-ad80-41cb-9a01-785ab5899a9d",
//         "sku": "SCA1PK1AP",
//         "tel": "31983006713",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Amanda Mendes Vieira Neves",
//         "aluno": "Amanda Mendes Vieira Neves",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "6ca510b3-4643-4e6c-a0ef-e83208ec6fc4",
//         "sku": "BWIWB1AP",
//         "tel": "31983006713",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Amanda Mendes Vieira Neves",
//         "aluno": "Amanda Mendes Vieira Neves",
//         "valor": 19,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "auto",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "22dfd715",
//         "sku": "IN2WB5AP",
//         "tel": "+5531995193176",
//         "data": "20/01/2025",
//         "link": "https://assina.ae/QgDj6ywW84zF7ViY9",
//         "nome": "Izaclara Cristiane Resende Ribeiro",
//         "aluno": "Izaclara Cristiane Resende Ribeiro",
//         "valor": 31,
//         "chegada": true,
//         "assinado": true,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange 2 - WB - 5th Ed - AP",
//         "type": "manual",
//         "orderId": "9c1b3cf9-9610-4a2a-bfbd-2a5b12ad1676"
//     },
//     {
//         "id": "261feaf3",
//         "sku": "SCA1PK1AP",
//         "tel": "31 9692-5590",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Nathanael Gomes da Silva",
//         "aluno": "Nathanael Gomes da Silva",
//         "valor": 20,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Short Course Adults - PK - 1st Ed- AP / SCA1PK1AP",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "8217a732",
//         "sku": "9781009040419",
//         "tel": "31 9692-5590",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Nathanael Gomes da Silva",
//         "aluno": "Nathanael Gomes da Silva",
//         "valor": 409,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Interchange Intro W/ EBOOK - SB - 5th Ed - BK / INISB5BK",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     },
//     {
//         "id": "8090ed87",
//         "sku": "BWIWB1AP",
//         "tel": "31 9692-5590",
//         "data": "21/01/2025",
//         "link": "",
//         "nome": "Nathanael Gomes da Silva",
//         "aluno": "Nathanael Gomes da Silva",
//         "valor": 19,
//         "chegada": false,
//         "assinado": false,
//         "retiradoPor": "",
//         "dataRetirada": "",
//         "materialDidatico": "Beginner Way Intro - WB - 1st Ed- AP",
//         "type": "manual",
//         "orderId": "3aec70c5-cba2-43f3-bbb0-bb2487b4c0bc"
//     }
// ]
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

// async function sender(req) {

//     const { event: { data } } = req

//     // console.log(data)
//     const { name, signatures, files } = await GetDocument(data.document)


//     const [type, id] = name.split("+")

//     if (type.includes("reciboMd")) {
//         const [nameTruncked, code] = documento.nome.split("+")

//         const [_, name] = nameTruncked.split("-")

//         const ordersSigned = await prisma.books.findFirst({
//             where: {
//                 nome: {
//                     contains: name,
//                     mode: "insensitive"
//                 }
//             }
//         })


//         if (!ordersSigned) {
//             console.log("Contrato de recibo não encontrado")
//             return res.status(400).json({ message: "not found" })
//         }

//         const { id } = ordersSigned

//         await prisma.books.update({
//             where: {
//                 id
//             },
//             data: {
//                 assinado: true
//             }
//         })

//         return res.status(201).json({ message: "link atribuido com sucesso" })
//     }


//     const dealWin = await winADeal(id)

//     const [deal] = await gatheringDataForDatabase([dealWin])


//     const create = async (responsible, data) => {
//         await prisma.registers.create({
//             data: {
//                 ...data,
//                 assinaturaContratoStatus: "Ok",
//                 historic: {
//                     create: {
//                         responsible: responsible,
//                         information: {
//                             field: "assinaturaContratoStatus",
//                             text: `O status do contrato foi alterado para assinado`,
//                             from: data.id,
//                         }
//                     }
//                 }
//             }
//         })
//         .then(async (response)=> {
//            await StartCicleWhenNewRegisterIsCreated(response)
//         })
//     }

//     const update = async (responsible, data) => {
//         await prisma.registers.update({
//             where: {
//                 id: data.id
//             },
//             data: {
//                 ...data,
//                 assinaturaContratoStatus: "Ok",
//                 historic: {
//                     create: {
//                         responsible: responsible,
//                         information: {
//                             field: "assinaturaContratoStatus",
//                             text: `O status do contrato foi alterado para assinado`,
//                             from: data.id,
//                         }
//                     }
//                 }
//             }
//         })
//     }

//     await prisma.registers.findUnique({
//         where: {
//             id: deal.id
//         }
//     }).then(async register => {
//         register ? update(data.user.name, deal) : create(data.user.name, deal)

//         const unityNumber = {
//             "Golfinho Azul": "31 8713-7018",
//             'PTB': "31 8713-7018",
//             'Centro': "31 8284-0590"
//         }

//         const curseMessages = {
//             "Inglês": `Hello, ${register.name}. Tudo bem com você? 😊
// Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar
// boas-vindas ao nosso curso de Inglês.
// Está pronto para deixar o verbo to be para trás? 🏃💨

// Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho.
// Se tiver alguma dúvida ou precisar de qualquer coisa,
// envie uma mensagem para o número pedagógico ${unityNumber[register.customFields["Unidade"]]} .
// I’ll see you in class`,

//             "Espanhol": `Hola, ${register.name}. Tudo bem com você? 😊
// Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de Espanhol. Está pronto para deixar o portunhol para trás? 🏃💨
// Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho.

// Se tiver alguma dúvida ou precisar de qualquer coisa,
// envie uma mensagem para o número pedagógico ${unityNumber[register.customFields["Unidade"]]}.
// Te veo en la clase 🇪🇸`,

//             "Tecnologia": `Hello, ${register.name}. Tudo bem com você? 😊
// Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de informática. Está pronto para aprender a montar documentos e planilhas completas? 😎
// Em poucos meses você vai estar dominando o Pacote Office, e eu vou estar aqui para te ajudar em cada passo do caminho.

// Se tiver alguma dúvida ou precisar de qualquer coisa,
// envie uma mensagem para o número pedagógico ${unityNumber[register.customFields["Unidade"]]}.
// Te esperamos na aula 👩‍💻`,
//         }


//         if (register.customFields['Background do Aluno'] !== "Rematrícula") {

//             await Promise.all([
//                 ScheduleBotMessages(
//                     register.name, register.customFields["Phone"],
//                     register.customFields["Data da primeira aula"],
//                     "Lembrete da primeira aula"),
//                 SendSimpleWpp(register.name, register.customFields["Phone"], curseMessages[register.customFields["Curso"]]),
//             ])

//             await CreateCommentOnTrello(
//                 register.name,
//                 register.customFields["Unidade"],
//                 `${data.user.name} assinou contrato via autentique no dia ${new Date().toLocaleDateString()}`)

//         }


//         return res.status(200).json({ message: "Success" })
//     })



// }

// sender(t)

