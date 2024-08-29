
import axios from "axios"
import { getToken } from "../core/getToken.js"

import prisma from "../../database/database.js"
import { Historic } from "../../database/historic/properties.js"
import { CreateCommentOnTrello } from "./externalConnections/trello.js"
import { SendtoWpp } from "./externalConnections/wpp.js"


import OrdersController from "../controllers/ordersController.js"

const historic = new Historic()

const routes = {
    "parcela": "ppStatus",
    "taxa de matricula": "tmStatus",
    "material didatico": "mdStatus",

    "ppStatus": "parcela",
    "tmStatus": "taxa de matricula",
    "mdStatus": "material didatico"
}

async function SyncContaAzulAndDatabase(header) {

    const backDay = new Date()
    const comebackDays = 25
    backDay.setDate(backDay.getDate() - comebackDays)
    const startDate = backDay.toISOString()

    const currentDate = new Date()
    const endDate = currentDate.toISOString()
    try {


        const sales = await axios.get(`https://api.contaazul.com/v1/sales?emission_start=${startDate}&emission_end=${endDate}&size=1000`, { headers: header })

        const filtered = sales.data.filter(res => {
            const status = res.payment.installments[0]?.status
            let notes = res.notes
            let cleanData = notes.replace(/\\n/g, "")
            return status === "ACQUITTED" && notes !== '' && JSON.parse(!(cleanData.includes("(")))
        })

        let notes = filtered.map(res => {
            try {
                let note = JSON.parse(res.notes)

                return {
                    aluno: note["Aluno"],
                    responsavel: note["Responsável"],
                    contract: note["contrato"],
                    service: note["serviço"],
                    tm: note['TM Valor'],
                    value: res.total,
                    unidade: note["Unidade"],
                    ppFPG: note["PP Forma PG"],
                    mdFPG: note["MD forma pg"],
                    tmFPG: note["TM forma de pg"]
                }
            } catch (error) {
                // console.log(res)
                console.log(`${res.customer.name} => error`)
            }

        })

        console.log(notes.length)

        await SearchEachSync(notes.filter(response => response !== undefined))
    } catch (error) {

        console.log(error.response.data)
    }
}


async function SearchEachSync(notes) {
    for (const response of notes) {
        let where = response.service !== undefined ? routes[response.service] : null

        if (where) {
            await prisma.person.findFirst({
                where: {
                    AND: [
                        {
                            contrato: {
                                contains: response.contract,
                            },
                        },
                        {
                            [where]: {
                                contains: "Pendente",
                            },
                        },
                    ],
                },
            })
                .then(data => data && UpdateEachOne(where, data))
            // .then(data => data && console.log(where, data))

        }
    }
}

const order = async (name, material, unity) => {

    const header = {
        "Authorization": `Bearer ${await getToken(unity)}`
    }

    const { data } = await axios.get("https://api.contaazul.com/v1/products?size=10000", { headers: header })

    const body = material.map(res => {
        let splited = res.split(" / ")
        const pdFiltered = data.filter(res => res.code.includes(splited[1]))
        return {
            sku: splited[1],
            nome: name,
            materialDidatico: splited[0],
            valor: pdFiltered[0].value,
            data: new Date().toLocaleDateString("pt-BR")
        }

    })
    return body
}


async function UpdateEachOne(where, data) {
    try {
        const update = async () => {
            await prisma.person.update({
                where: { contrato: data.contrato },
                data: {
                    [where]: "Ok"
                }
            })
                .then(async (response) => {
                    console.log(`${response.aluno} success updated / ${where} / ${response.unidade}`)

                    let type = {
                        "ppStatus": response.ppFPG,
                        "tmStatus": response.tmFPG,
                        "mdStatus": response.mdFPG
                    }

                    let trelloMessage = `${response.name} -- realizou o pagamento da(o) ${routes[where]} via ${type[where]} no valor de ${response.value} no dia ${new Date().toLocaleDateString('pt-BR')}`

                    CreateCommentOnTrello(response.name, response.unidade, trelloMessage)



                    if (where === "mdStatus") {
                        let message = `>${response.name}` + "-- realizou o pagamento do material didático ||" + "`" + `${response.materialDidatico}` + "`"
                        SendtoWpp(message, response.unidade)

                        let filtered = response.materialDidatico.filter(res => res.includes("BK"))


                        let bodyOrder = {
                            body: {
                                orders: await order(response.name, filtered, response.unidade)

                            }
                        }

                        const idList = {
                            "Golfinho Azul": "PTB",
                            'PTB': "PTB",
                            'Centro': "Centro"
                        }
                        await OrdersController.store(bodyOrder, idList[response.unidade])

                    }
                })

                .catch(e => console.log(e))
        }

        const storeHistoric = async () => {
            await historic._store("Automatização", where, "Ok", data.contrato)
        }


        Promise.all([storeHistoric(), update(),])

    } catch (error) {
        console.log(error)
    }
}





const syncContaAzul = async () => {
    console.log("payments ca updates")

    for (const realToken of ["Centro", "PTB"]) {
        const header = {
            "Authorization": `Bearer ${await getToken(realToken, 'refresh')}`
        }
        await SyncContaAzulAndDatabase(header)

    }
}

export default syncContaAzul