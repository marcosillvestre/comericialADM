import axios from "axios";
import "dotenv/config";
import prisma from "../../database/database.js";
class TrelloWebhook {

    async capture(req, res) {
        const data = req.body
        if (Array.isArray(data)) {
            try {
                const webhook = data[0].action

                let body = {
                    nameEvent: webhook.data.card.name,
                }
                if (webhook.data.checklist.name === "Reunião aceita pelo cliente:") {
                    let id = webhook.data.card.id
                    const customFields = async () => {
                        await axios.get(`https://api.trello.com/1/cards/${id}/customFieldItems?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
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
                        await axios.get(`https://api.trello.com/1/cards/${id}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
                            .then(response => {
                                let desc = response.data.desc
                                body["descrição"] = desc.replace('"', '')
                            })
                    }

                    Promise.all([customFields(), description()])
                        .then(async () => {
                            let hook = webhook.data.board.id === "65ef31794aa709ef4baaa3f5" && // aqui vai o quadro do ptb, por enquanto so tem um 
                                "https://hook.us1.make.com/gjazk2ejong10c7ewustyjfwu93yej0s";

                            await axios.post(hook, body)
                                .then((response) => {
                                    console.log(response.data)
                                })
                        })
                        .catch(err => {
                            console.log(err)
                        })
                }

                const boolean = webhook.data.checklist.name === "Primeira aula ?" || webhook.data.checkItem.name === "Primeira aula ?" && webhook.data.checkItem.state === "complete"
                console.log(boolean)
                if (boolean) {
                    console.log(webhook)
                    const nameSearch = webhook.data.card.name
                    const person = await prisma.person.findUnique({
                        where: { name: nameSearch }
                    })


                    if (person) {
                        await prisma.person.update({
                            where: { contrato: person.contrato },
                            data: {
                                paStatus: "Ok"
                            }
                        })
                    }
                }

            } catch (error) {
                console.log(error)
            }
        }

        return res.status(200).send("Accepted")
    }

}
export default new TrelloWebhook()