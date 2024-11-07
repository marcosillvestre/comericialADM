import { DateTransformer } from "../../../config/DateTransformer.js";
import { PastCodes } from "../../../config/getLastMonday.js";

import prisma from "../../../database/database.js";
import { Historic } from '../../../database/historic/properties.js';
import { CompleteCheckPointOnTrello } from "../../connection/externalConnections/trello.js";
import { SendSimpleWpp } from "../../connection/externalConnections/wpp.js";


const { getLastMondayCode } = new PastCodes()
class OrderController {

    async index(req, res) {

        const { dates } = req.query

        const [initial, final] = dates.split("~")

        const initialDate = new Date(initial).setUTCHours(0, 0, 0, 0)
        const finalDate = new Date(final).setUTCHours(0, 0, 0, 0)


        const orders = await prisma.orders.findMany()


        const DateFilter = await Promise.all(orders.map(async r => {
            let date = new Date(r.created_at)

            return (date >= initialDate && date <= finalDate) ? r : null;

        }))



        let generalMonthsBefore = DateFilter.filter(res => res !== null)

        return res.status(200).json(generalMonthsBefore)
    }



    async store(req, res) {
        const { orders, unity } = req.body



        const date = new Date()
        const code = await getLastMondayCode(date);


        const response = await prisma.orders.findMany({
            where: {
                unity: unity
            }
        })


        let bools = []
        if (response.length > 0) {
            for (let index = 0; index < response.length; index++) {
                const resp = response[index];

                const { orders: data } = resp


                for (let index = 0; index < data.length; index++) {
                    const ord = data[index];

                    const haveAluno = ord.aluno

                    for (let index = 0; index < orders.length; index++) {
                        const item = orders[index];


                        let whenHaveAluno = item.materialDidatico === ord.materialDidatico &&
                            item.nome === ord.nome &&
                            item.aluno === ord.aluno


                        let whenDontHaveAluno = item.materialDidatico === ord.materialDidatico &&
                            item.nome === ord.nome

                        let isThere = haveAluno ? whenHaveAluno : whenDontHaveAluno

                        bools.push({ code: resp.id, isHere: isThere })
                    }

                }
            }

        }

        let founded = bools.every(res => res.isHere === false)

        const update = async (id, data) => {
            for (let index = 0; index < data.length; index++) {
                const element = data[index];

                await prisma.orders.update({
                    where: {
                        id
                    },
                    data: {
                        orders: {
                            push: element
                        }
                    }
                })
                    .then(() => {
                        if (res) return res.status(201).json({ message: "Pedido criado com sucesso" })
                        console.log("Pedido agregado")
                    })
                    .catch((err) => {
                        console.log(err)
                        if (res) return res.status(400).json({ err })
                    })
            }

        }

        const creation = async (code, data) => {

            await prisma.orders.create({
                data: {
                    code,
                    orders: data,
                    unity
                }
            })

                .then(() => {
                    if (res) return res.status(201).json({ message: "Pedido criado com sucesso" })
                    console.log("Pedido criado com sucesso")
                })
                .catch((err) => {
                    console.log(err)
                    if (res) return res.status(400).json({ err })
                })
        }

        if (founded) {

            let twin = await getLastMondayCode(await DateTransformer(orders[0].data))

            if (response.find(res => res.code === twin)) {

                const { id } = await prisma.orders.findFirst({
                    where: {
                        code: twin
                    }
                })

                return await update(id, orders)
            }
            await creation(code, orders)
        }


    }


    async update(req, res) {
        const { id, where, value, responsible } = req.body

        const historic = new Historic()

        try {
            const filter = await prisma.orders.findUnique({
                where: {
                    id: id
                }
            })


            let filtered = filter?.orders.filter(res => res.id !== value)


            await prisma.orders.update({
                where: {
                    id: id
                },
                data: {
                    orders: {
                        set: filtered
                    }
                }

            })

            await historic._store(responsible, "Pedido", "Deletado", filter.code)

            if (res) return res.status(201).json({ message: "Pedido removido com sucesso" })
            console.log("Pedido editado")

        } catch (error) {

            console.log(error)
            return res.status(400).json({ message: error })

        }

    }

    async putDataOrders(req, res) {
        const { id, where, value, order } = req.body

        //orders é um array de ids dos pedidos 

        const data = await prisma.orders.findUnique({
            where: {
                id: id
            }
        })

        const set = []

        for (let index = 0; index < data.orders.length; index++) {

            const element = data.orders[index];

            const filtered = order.findIndex(res => res === element.id)


            if (filtered !== -1) element[where] = value


            set.push(element)

        }


        try {
            await prisma.orders.update({
                where: {
                    id: id
                },
                data: {
                    orders: {
                        set: set
                    }
                }
            })
                .then(async res => {
                    if (where === "dataRetirada") await CompleteCheckPointOnTrello(
                        res.orders.find(o => o.id === order[0]),
                        res.unity,
                        "Material Didático/Confirmação de retirada pelo aluno ou responsável")

                    if (where === "chegada" && value) {
                        const rightOrder = res.orders.find(o => o.id === order[0])
                        if (rightOrder) {

                            await CompleteCheckPointOnTrello(
                                rightOrder,
                                res.unity,
                                "Material Didático/Confirmação de disponibilidade para retirada do material na escola")


                            const unityNumber = {
                                "Golfinho Azul": "31 8713-7018",
                                'PTB': "31 8713-7018",
                                'Centro': "31 8284-0590"
                            }

                            if (rightOrder.tel) await SendSimpleWpp(rightOrder.nome, rightOrder.tel,
                                `Olá *${rightOrder.nome}*, 
Temos uma ótima notícia, o seu material didático: 

> ${rightOrder.materialDidatico}

já está disponível para retirada em nossa unidade. 

Qualquer dúvida, entre em contato com o nosso whatsapp pedagógico através do número da unidade 

> ${res.unity} : ${unityNumber[res.unity]}.
                                
Atenciosamente, equipe American Way.
FAVOR NÃO RESPONDER ESTA MENSAGEM 🗽.`)
                        }
                    }
                })

            return res.status(201).json({ message: "link atribuido com sucesso" })

        } catch (error) {
            console.log(error)
            return res.status(201).json({ message: error })
        }



    }

}

export default new OrderController