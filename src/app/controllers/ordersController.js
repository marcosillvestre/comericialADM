import { getLastMondayCode } from "../../config/getLastMonday.js";
import prisma from "../../database/database.js";
import { Historic } from '../../database/historic/properties.js';
class OrderController {
    async index(req, res) {

        const orders = await prisma.orders.findMany()

        return res.status(200).json(orders)
    }


    async store(req, res) {
        const { orders, unity } = req.body

        const code = await getLastMondayCode();


        const weekOrders = await prisma.orders.findMany({
            where: {
                code: code,
                unity: unity
            }
        })


        if (weekOrders.length > 0) {
            await prisma.orders.update({
                where: {
                    id: weekOrders[0].id
                },
                data: {
                    orders: {
                        push: orders[0]
                    }
                }
            })
                .then(() => {
                    if (res) return res.status(201).json({ message: "Pedido criado com sucesso" })
                    console.log("Pedido agregado")
                    return
                })
                .catch((err) => {
                    return res.status(400).json({ err })
                })
        } else {
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
                    return res.status(400).json({ err })
                })
        }


    }

    async update(req, res) {
        const { id, where, value, responsible } = req.body

        const historic = new Historic()

        let code;

        if (where === "arrived") {
            try {
                await prisma.orders.update({
                    where: {
                        id: id
                    },
                    data: {
                        arrived: value
                    }

                })
                    .then(res => {
                        code = res.code
                    })

                await historic._store(responsible, where, value, code)

                if (res) return res.status(201).json({ message: "Pedido editado com sucesso" })
                console.log("Pedido editado")
            } catch (error) {

                return res.status(400).json({ error })
            }
        }




        try {
            const filter = await prisma.orders.findUnique({
                where: {
                    id: id
                }
            })


            let filtering = filter?.orders.filter(res => res.sku === value.sku && res.nome === value.nome && res.materialDidatico === value.materialDidatico)
            let filtered = filter?.orders.filter(res => res !== filtering[0])


            await prisma.orders.update({
                where: {
                    id: id
                },
                data: {
                    orders: {
                        set: filtered ? filtered : []
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

    async putLinkSignature(req, res) {
        const { id, link, orders } = req.body


        const { orders: data } = await prisma.orders.findUnique({
            where: {
                id: id
            }
        })

        const set = []

        for (let index = 0; index < data.length; index++) {

            const element = data[index];

            const filtered = orders.findIndex(res =>
                res.materialDidatico === element.materialDidatico &&
                res.nome === element.nome)


            filtered !== -1 ? set.push({ ...element, link }) :
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

            return res.status(201).json({ message: "link atribuido com sucesso" })

        } catch (error) {
            console.log(error)
            return res.status(201).json({ message: error })
        }



    }

}

export default new OrderController