import { DateTransformer } from "../../../config/DateTransformer.js";
import { PastCodes } from "../../../config/getLastMonday.js";

import prisma from "../../../database/database.js";
import { Historic } from '../../../database/historic/properties.js';
import { CompleteCheckPointOnTrello } from "../../connection/externalConnections/trello.js";
import { SendSimpleWpp } from "../../connection/externalConnections/wpp.js";

const historic = new Historic()
const { getLastMondayCode } = new PastCodes()

import * as yup from 'yup';
class OrderController {

    async index(req, res) {


        const schema = yup.object().shape({
            dates: yup.string().required(),

        })

        try {
            await schema.validateSync(req.query, { abortEarly: false })

        } catch (error) {
            return res.status(400).json({ message: error })
        }

        const { dates } = req.query


        const [initial, final] = dates.split("~")

        const initialDate = new Date(initial).setUTCHours(0, 0, 0, 0)
        const finalDate = new Date(final).setUTCHours(0, 0, 0, 0)


        const orders = await prisma.weekOrder.findMany({
            include: {
                orders: true
            }
        })


        const DateFilter = await Promise.all(orders.map(async r => {
            let date = new Date(r.created_at)

            return (date >= initialDate && date <= finalDate) ? r : null;

        }))



        let generalMonthsBefore = DateFilter.filter(res => res !== null)

        return res.status(200).json(generalMonthsBefore)
    }



    async store(req, res) {
        const schema = yup.object().shape({
            orders: yup.array().required().of(
                yup.object().shape({
                    sku: yup.string().required(),
                    nome: yup.string().required(),
                    materialDidatico: yup.string().required(),
                    valor: yup.number().required(),
                    data: yup.string().required(),
                    assinado: yup.boolean().required(),
                    dataRetirada: yup.string(),
                    link: yup.string(),
                    retiradoPor: yup.string(),
                    aluno: yup.string(),
                    tel: yup.string(),
                })
            ),
            unity: yup.string().required()

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

        } catch (error) {
            console.log(error)
            throw new Error(error);

            // return res.status(400).json({ message: error })
        }

        const { orders, unity } = req.body

        const date = new Date()
        const code = await getLastMondayCode(date);


        const update = async (id, data) => {

            await prisma.weekOrder.update({
                where: {
                    id
                },
                data: {
                    orders: {
                        create: data
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

        const creation = async (code, data) => {


            await prisma.weekOrder.create({
                data: {
                    code,
                    orders: {
                        create: data
                    },
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


        for (let index = 0; index < orders.length; index++) {
            const order = orders[index]

            const searchOnDb = await prisma.books.findFirst({
                where: {
                    nome: order.nome,
                    aluno: order.aluno,
                    materialDidatico: order.materialDidatico
                }
            })

            if (!searchOnDb) {

                let twin = await getLastMondayCode(await DateTransformer(orders[0].data))

                const weekOrder = await prisma.weekOrder.findFirst({
                    where: {
                        code: twin,
                        unity
                    }
                })

                weekOrder ? await update(weekOrder.id, orders) : await creation(code, orders)
            }
        }

    }


    async edit(req, res) {
        const schema = yup.object().shape({

            id: yup.string().required(),
            responsible: yup.string().required()

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

        } catch (error) {
            return res.status(400).json({ message: error })
        }

        const { id, responsible } = req.body


        try {
            await prisma.books.delete({
                where: {
                    id
                }
            })



            await historic._store(responsible, "Pedido", "Deletado", id)

            if (res) return res.status(201).json({ message: "Pedido removido com sucesso" })
            console.log("Pedido editado")

        } catch (error) {

            console.log(error)
            return res.status(400).json({ message: error })

        }

    }

    async putDataOrders(req, res) {
        const schema = yup.object().shape({
            where: yup.string().required(),
            value: yup.string(),
            order: yup.array().required().of(yup.string())
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: error })
        }

        const { where, value, order } = req.body

        //orders é um array de ids dos pedidos 

        try {

            for (let index = 0; index < order.length; index++) {
                const bookId = order[index];

                await prisma.books.update({
                    where: {
                        id: bookId
                    },
                    data: {
                        [where]: value
                    },
                    include: {
                        orderRelated: true
                    }
                })
                    .then(async response => {
                        const { orderId, orderRelated, ...rest } = response

                        if (where === "dataRetirada") await CompleteCheckPointOnTrello(
                            rest,
                            orderRelated.unity,
                            "Material Didático/Confirmação de retirada pelo aluno ou responsável")

                        if (where === "chegada" && value) {
                            await CompleteCheckPointOnTrello(
                                rest,
                                orderRelated.unity,
                                "Material Didático/Confirmação de disponibilidade para retirada do material na escola")


                            const unityNumber = {
                                "Golfinho Azul": "31 8713-7018",
                                'PTB': "31 8713-7018",
                                'Centro': "31 8284-0590"
                            }

                            if ("tel" in rest) await SendSimpleWpp(rest.nome, rest.tel,
                                `Olá *${rest.nome}*, 
Temos uma ótima notícia, o seu material didático: 

> ${rest.materialDidatico}

já está disponível para retirada em nossa unidade. 

Qualquer dúvida, entre em contato com o nosso whatsapp pedagógico através do número da unidade 

> ${rest.unity} : ${unityNumber[rest.unity]}.
                                
Atenciosamente, equipe American Way.
FAVOR NÃO RESPONDER ESTA MENSAGEM 🗽.`)

                        }
                    })
            }

            return res.status(201).json({ message: "link atribuido com sucesso" })

        } catch (error) {
            console.log(error)
            return res.status(201).json({ message: error })
        }



    }

}

export default new OrderController