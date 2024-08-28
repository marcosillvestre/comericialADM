import prisma from "../../database/database.js";

class OrderController {
    async index(req, res) {

        const orders = await prisma.orders.findMany()

        return res.status(200).json(orders)
    }


    async store(req, res) {
        const { orders } = req.body

        function getLastMonday(date = new Date) {
            const dayOfWeek = date.getDay();
            const daysSinceMonday = (dayOfWeek + 6) % 7;
            const lastMonday = new Date(date);
            lastMonday.setDate(date.getDate() - daysSinceMonday);
            return lastMonday;
        }

        const lastMonday = await getLastMonday();
        let code = lastMonday.toLocaleDateString("pt-BR").replace("/", "").replace("/", "")

        const weekOrders = await prisma.orders.findMany({
            where: {
                code: code
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
                })
                .catch((err) => {
                    return res.status(400).json({ err })
                })


        }
        try {

            await prisma.orders.create({
                data: {
                    code,
                    orders
                }
            })

            console.log("Pedido criado com sucesso")
            return res.status(201).json({ message: "Order created successfully" })

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "Order created successfully" })
        }
    }

    async update(req, res) {
        const { id, where, value } = req.body


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

            let filtered = filter.orders.filter(res => res.sku !== value)

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

            if (res) return res.status(201).json({ message: "Pedido removido com sucesso" })
            console.log("Pedido editado")

        } catch (error) {

            console.log(error)
            return res.status(400).json({ message: error })

        }



    }

}

export default new OrderController