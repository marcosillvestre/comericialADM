import { getLastMondayCode } from "../../config/getLastMonday.js";
import prisma from "../../database/database.js";
import { Historic } from '../../database/historic/properties.js';
import { CompleteCheckPointOnTrello } from "../connection/externalConnections/trello.js";
class OrderController {
    async index(req, res) {

        const orders = await prisma.orders.findMany()

        return res.status(200).json(orders)
    }

    async store(req, res) {
        const { orders, unity } = req.body

        const code = await getLastMondayCode();


        const response = await prisma.orders.findMany({
            where: {
                code: code,
                unity: unity
            }
        })
        if (response.length > 0) {
            for (let index = 0; index < orders.length; index++) {
                const element = orders[index];

                if (response[0].orders.some(res => res.nome === element.nome &&
                    res.materialDidatico === element.materialDidatico)) return

                await prisma.orders.update({
                    where: {
                        id: response[0].id
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
                        return
                    })
                    .catch((err) => {
                        console.log(err)
                        if (res) return res.status(400).json({ err })
                    })

            }
        }

        if (response.length === 0) {
            await prisma.orders.create({
                data: {
                    code,
                    orders,
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
                    if (where === "dataRetirada") await CompleteCheckPointOnTrello(res.orders, res.unity, "Material Didático/Confirmação de retirada pelo aluno ou responsável")
                    if (where === "chegada") await CompleteCheckPointOnTrello(res.orders, res.unity, "Material Didático/Confirmação de disponibilidade para retirada do material na escola")

                })

            return res.status(201).json({ message: "link atribuido com sucesso" })

        } catch (error) {
            console.log(error)
            return res.status(201).json({ message: error })
        }



    }

}

export default new OrderController