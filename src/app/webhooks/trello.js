import axios from "axios";
import "dotenv/config";
import prisma from "../../database/database.js";
import { Historic } from '../../database/historic/properties.js';
import { createTasks, updateStageRd } from "../connection/externalConnections/rdStation.js";
import { SendtoWpp, StartChatbot } from '../connection/externalConnections/wpp.js';
const historic = new Historic()
class TrelloWebhook {


    async capture(req, res) {
        const { action } = req.body


        try {
            const webhook = action

            let body = {
                nameEvent: webhook.data.card.name,
            }
            let cardId = webhook.data.card.id

            if (webhook.data.checklist.name === "Reunião aceita pelo cliente:" &&
                webhook.data.checkItem.state === "complete") {
                const customFields = async () => {
                    await axios.get(`https://api.trello.com/1/cards/${cardId}/customFieldItems?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
                        .then(res => {
                            for (const field of res.data) {
                                if ("text" in field.value) {
                                    if (field.value.text.includes("@")) {
                                        body["Email do coordenador"] = field.value.text
                                    } else {
                                        body["Proposta de alteração"] = field.value.text
                                    }
                                }
                                const date = new Date(field.value.date)
                                body["Data de início"] = new Date(date.setDate(date.getDate() - 1))
                                body["Data de fim"] = field.value.date
                            }
                        })
                }

                const description = async () => {
                    await axios.get(`https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
                        .then(response => {
                            let desc = response.data.desc
                            body["descrição"] = desc.replace('"', '')
                        })
                }

                Promise.all([customFields(), description()])
                    .then(async () => {
                        let hook = webhook.data.board.id === "65ef31794aa709ef4baaa3f5" && // aqui vai o quadro do ptb, por enquanto so tem um 
                            `${process.env.CALENDAR_WEBHOOK}`;

                        await axios.post(hook, body)
                            .then(() => {
                                let message = `**${body.nameEvent}** --> a reunião de rematrícula foi marcada para o dia ${body["Data de fim"]}`
                                body["descrição"].includes("Centro") ?
                                    SendtoWpp(message, "Centro") : SendtoWpp(message, "PTB")
                            })
                    })
                    .catch(err => {
                        console.log(err)
                    })
            }

            if (webhook.data.checklist.name === "Rematriculado:" &&
                webhook.data.checkItem.state === "complete") {
                let body = {
                    unidade: webhook.data.board.name.split(" - ")[1]
                }

                await axios.get(`https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
                    .then(response => {
                        let desc = response.data.desc

                        let parsed = JSON.parse("{" + desc + "}")

                        body["id"] = parsed.id
                    })


                webhook.data.checkItem.name === "Sim" && await updateStageRd(body, "win" + body.unidade)
                webhook.data.checkItem.name === "Não" && await updateStageRd(body, "lose" + body.unidade)


            }


            const boolean =
                webhook.data.checkItem.name.includes("Primeira aula") ||
                webhook.data.checkItem.name.includes("Fez a primeira aula")
                && webhook.data.checkItem.state === "complete"

            if (boolean) {
                const nameSearch = webhook.data.card.name
                const data = await prisma.person.findMany({
                    where: {
                        AND: [
                            {
                                name: {
                                    contains: nameSearch,
                                    mode: "insensitive"
                                },
                            },
                            {
                                paStatus: {
                                    contains: "Pendente",
                                },
                            },
                        ],
                    }
                })

                console.log(nameSearch)
                if (data.length > 0) {
                    const update = async () => {

                        await prisma.person.update({
                            where: { contrato: data[0].contrato },
                            data: {
                                paStatus: "Ok"
                            }
                        }).then(() => console.log('pa updated'))
                    }



                    const storeHistoric = async () => {
                        await historic._store("Automatização", "paStatus", "Ok", data[0].contrato)
                    }

                    Promise.all([
                        storeHistoric(),
                        update(),
                        createTasks(data[0].name, data[0].aluno, data[0].classe),
                        StartChatbot(data[0].name, data[0].tel, process.env.BOT_INICIO, "Feedback de primeira aula")
                    ])
                }
            }


        } catch (error) {
            console.log(error)
        }


        return res.status(200).send("Accepted")
    }

}
export default new TrelloWebhook()