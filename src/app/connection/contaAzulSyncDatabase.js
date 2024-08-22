
import axios from "axios"
import { getToken } from "../core/getToken.js"

import prisma from "../../database/database.js"
import { Historic } from "../../database/historic/properties.js"
import { CreateCommentOnTrello } from "./externalConnections/trello.js"
import { SendtoWpp } from "./externalConnections/wpp.js"

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

    const comebackDays = 25
    const backDay = new Date()
    backDay.setDate(backDay.getDate() - comebackDays)
    const startDate = backDay.toISOString()

    const currentDate = new Date()
    const endDate = currentDate.toISOString()

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

    for (const response of notes) {
        if (response !== undefined) {
            let where = response.service !== undefined ? routes[response.service] : null
            if (where) {
                await prisma.person.findMany({
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
                    .then(async data => {
                        if (data.length > 0) {
                            try {
                                const update = async () => {
                                    await prisma.person.update({
                                        where: { contrato: data[0].contrato },
                                        data: {
                                            [where]: "Ok"
                                        }
                                    })
                                        .then((res) => {
                                            console.log(`${response.aluno} success updated / ${where} / ${response.unidade}`)

                                            let type = {
                                                "ppStatus": response.ppFPG,
                                                "tmStatus": response.tmFPG,
                                                "mdStatus": response.mdFPG
                                            }

                                            let trelloMessage = `${res.name} -- realizou o pagamento da(o) ${routes[where]} via ${type[where]} no valor de ${response.value} no dia ${new Date().toLocaleDateString()}`

                                            CreateCommentOnTrello(res.name, response.unidade, trelloMessage)


                                            if (where === "mdStatus") {
                                                let message = `${res.name} -- realizou o pagamento do material didático || ${res.materialDidatico}`
                                                SendtoWpp(message, response.unidade)

                                            }
                                        })

                                        .catch(e => console.log(e))
                                }

                                const storeHistoric = async () => {
                                    await historic._store("Automatização", where, "Ok", data[0].contrato)
                                }


                                Promise.all([storeHistoric(), update(),])

                            } catch (error) {
                                console.log(error)
                            }
                        }
                    })


            }
        }
    }

}



let unities = ["Centro", "PTB"]

const syncContaAzul = async () => {
    console.log("payments ca updates")

    for (const realToken of unities) {
        const header = {
            "Authorization": `Bearer ${await getToken(realToken, 'refresh')}`
        }
        await SyncContaAzulAndDatabase(header)
    }
}


export default syncContaAzul


