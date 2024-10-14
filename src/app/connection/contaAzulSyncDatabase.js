import axios from "axios"
import { v4 } from "uuid"
import { StringsMethods } from "../../config/serializerStrings.js"
import prisma from "../../database/database.js"
import { Historic } from "../../database/historic/properties.js"
import ordersController from "../controllers/internal/ordersController.js"
import { getToken } from "../core/getToken.js"
import { getAllSales } from "./externalConnections/contaAzulStrategy.js"
import { CompleteCheckPointOnTrello, CreateCommentOnTrello } from "./externalConnections/trello.js"
import { SendtoWpp } from "./externalConnections/wpp.js"

const historic = new Historic()
const { spacesAndLowerCase } = new StringsMethods()



const routes = {
    "parcela": "ppStatus",
    "taxa de matricula": "tmStatus",
    "material didatico": "mdStatus",

    "ppStatus": "parcela",
    "tmStatus": "taxa de matricula",
    "mdStatus": "material didatico"
}
const idList = {
    "Golfinho Azul": "PTB",
    'PTB': "PTB",
    'Centro': "Centro"
}

const order = async (name, material, unity, tel, aluno) => {

    const header = {
        "Authorization": `Bearer ${await getToken(unity)}`
    }


    if (material[0].id === undefined) {
        const { data } = await axios.get("https://api.contaazul.com/v1/products?size=10000", { headers: header })

        const body = material.map(res => {
            let splited = res.split(" / ")
            const pdFiltered = data.filter(res => res.code.includes(splited[1]))
            return {
                id: v4().slice(0, 8),
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
                tel
            }

        })

        return body
    }

    const body = await Promise.all(material.map(async res => {
        try {

            const { data } = await axios.get(`https://api.contaazul.com/v1/products/${res.id}`, { headers: header })

            return {
                id: v4().slice(0, 8),
                sku: data.code,
                nome: name,
                materialDidatico: data.name,
                valor: data.value,
                data: new Date().toLocaleDateString("pt-BR"),
                type: "manual",
                assinado: false,
                retiradoPor: "",
                dataRetirada: "",
                link: "",
                aluno,
                tel
            }
        } catch (error) {
            return error.response.data
        }
    }))
    return body

}


async function SyncOrdersToContaAzul(sale, headers, unity) {

    const { id, customer, payment } = sale
    if (payment.installments[0]?.status === "ACQUITTED") {
        console.log(`[ORDER] => ${customer.name} ` + unity)


        const { data } = await axios.get(
            `https://api.contaazul.com/v1/sales/${id}/items?Type=Product`,
            { headers: headers })

        let item = data.map(item => {
            return item.itemType === "PRODUCT" ? item.item : null
        })


        const find = await prisma.person.findFirst({
            where: {
                name: {
                    contains: customer.name,
                    mode: "insensitive"
                }
            }
        })
        if (find) {
            var { tel, aluno } = find
        }

        const bodyOrder = {
            body: {
                orders: await order(
                    customer.name,
                    item.filter(res => res.item !== null),
                    unity,
                    tel || "",
                    aluno || "",
                ),
                unity: idList[unity]
            }
        }

        item.length > 0 && await ordersController.store(bodyOrder)


    }
}


const getSalesByCustomerId = async (list, headers, unity) => {

    const allSales = await getAllSales(headers)


    if (!allSales) {
        console.log("Erro na busca")
        return
    }


    const data = [];

    for (let index = 0; index < list.length; index++) {
        const element = list[index];

        const sale = allSales.
            filter(allSales =>
                spacesAndLowerCase(allSales.customer.name) ===
                spacesAndLowerCase(element.name)
            )

        if (sale.length === 0) continue

        for (let secIndex = 0; secIndex < sale.length; secIndex++) {
            const secElement = sale[secIndex];

            const { notes, payment, customer, id } = secElement

            if (notes === "") {
                await SyncOrdersToContaAzul(secElement, headers, unity)
                continue
            }

            let parsed = () => {
                let cleanData = notes.replace(/\\n/g, "")
                const service = JSON.parse(cleanData)["serviço"]
                return service
            }

            let service = await parsed()

            if (!element.pendents.some(r => r === routes[service])) continue

            if (payment.installments[0] && payment.installments[0]?.status === "ACQUITTED") data.push({
                id,
                name: customer.name,
                pendentes: element.pendents,
                service,
                contrato: element.contrato,
                payment: payment.installments[0],
            })
        }
    }


    return data.filter(res => res !== undefined)
}


async function Echo(response, where) {

    await historic._store("Automatização", where, "Ok", response.contrato)

    if (where === "mdStatus") {

        let message = `> *${response.name}*
realizou o pagamento do material didático

> ${response.materialDidatico}`

        await SendtoWpp(message, response.unidade)


        if (!(response.materialDidatico.find(r => r === "Outros" || r === "Office"))) {

            let bodyOrder = {
                body: {
                    orders: await order(
                        response.name,
                        response.materialDidatico,
                        response.unidade,
                        response.tel,
                        response.aluno
                    ),
                    unity: idList[response.unidade]
                }
            }

            await ordersController.store(bodyOrder)

        }
    }

    let checkup = {
        "ppStatus": "AUTOMÁTICO - Confirmação de pagamento da primeira mensalidade.",
        "tmStatus": "AUTOMÁTICO - Confirmação pagamento da taxa de matrícula (se haver)",
        "mdStatus": "AUTOMÁTICO - Confirmação de pagamento do material didático."
    }


    let type = {
        "ppStatus": response.ppFormaPg,
        "tmStatus": response.tmFormaPg,
        "mdStatus": response.mdFormaPg
    }

    let trelloMessage = `${response.name} -- realizou o pagamento da(o) ${routes[where]} via ${type[where]} no dia ${new Date().toLocaleDateString('pt-BR')}`

    Promise.all([
        CompleteCheckPointOnTrello([{ nome: response.name }], response.unidade, `ADM - Checkup inicial/${checkup[where]}`),
        CreateCommentOnTrello(response.name, response.unidade, trelloMessage)
    ])




}

async function updateOnDatabase(contrato, whereIs) {

    const date = new Date().toISOString()
    const registerDates = {
        "ppStatus": "ppData",
        "tmStatus": "tmData",
        "mdStatus": "mdData"
    }

    const where = routes[whereIs]

    const response = await prisma.person.update({
        where: {
            contrato: contrato
        },
        data: {
            [where]: "Ok",
            [registerDates[where]]: date,
        }
    }).then(async (response) => {
        console.log(`${response.name} success updated / ${where} / ${response.unidade}`)

        await Echo(response, where)
    })

    return response ? "Done" : "Error"
}

async function SearchPendents(unity, headers) {

    await prisma.person.findMany({
        where: {
            unidade: unity,
            OR: [
                {
                    mdStatus: {
                        equals: 'Pendente',
                    },
                },
                {
                    ppStatus: {
                        equals: 'Pendente',
                    }
                },
                {
                    tmStatus: {
                        equals: 'Pendente',
                    }
                },
            ],
        },
        select: {
            name: true,
            dataMatricula: true,
            mdStatus: true,
            ppStatus: true,
            tmStatus: true,
            unidade: true,
            contrato: true,
            curso: true
        }
    })
        .then(async r => {
            console.log(r.length + " [PENDINGS]")


            const mapped = Promise.all(r.map(async (item) => {
                const pendentes = Object.keys(item)
                    .filter(key => item[key] === 'Pendente');

                return {
                    name: item.name,
                    pendents: pendentes,
                    contrato: item.contrato
                }
            }))

            const map = await mapped
            const paid = await getSalesByCustomerId(map, headers, unity)


            for (let index = 0; index < paid.length; index++) {
                const element = paid[index];
                const { service, pendentes, payment, name } = element

                if (pendentes.find(pend => pend === routes[service])) {
                    await updateOnDatabase(
                        element.contrato,
                        service
                    )
                }

            }

        })

}

const syncContaAzul = async () => {
    console.log("Payments ca updates")

    for (const realToken of [
        "Centro",
        "PTB"
    ]) {
        const header = {
            "Authorization": `Bearer ${await getToken(realToken, 'refresh')}`
        }


        await Promise.all([
            SearchPendents(realToken, header),

        ])

    }
}


export default syncContaAzul
