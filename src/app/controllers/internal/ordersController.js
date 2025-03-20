import { HandleUTCDate } from "../../../config/DateTransformer.js";
import { PastCodes } from "../../../config/getLastMonday.js";

import prisma from "../../../database/database.js";
import { Historic } from '../../../database/historic/properties.js';

const { _storeLog, _store } = new Historic()
const { getLastMondayCode } = new PastCodes()

import * as yup from 'yup';
class OrderController {

    async index(req, res) {
        const schema = yup.object().shape({
            dates: yup.string().required(),

            take: yup.string().required(),
            skip: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
            dateType: yup.string().required(),
            typeFilter: yup.array().required(),

        })



        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { take, skip, orderBy, typeFilter, dates, orderFor } = req.body

            const [initial, final] = dates.split("~")

            const skipParsed = parseInt(skip)
            const takeParsed = parseInt(take)

            const filters = typeFilter.map(res => {
                const bools = {
                    "Sim": true,
                    "Não": false
                }
                if (res.label.includes("DATA")) {
                    const [initialValue, finalValue] = res.value.split("~")

                    return {
                        [res.key]: {
                            gte: HandleUTCDate(initialValue),
                            lte: HandleUTCDate(finalValue)
                        }

                    }
                }
                return {
                    [res.key]: {
                        equals: !bools[res.value] ? res.value : bools[res.value],

                    }
                }
            })

            const [order, count] = await prisma.$transaction([
                prisma.orders.findMany({
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    take: takeParsed,
                    skip: skipParsed,
                    where: {
                        AND: [
                            {
                                created_at: {
                                    gte: HandleUTCDate(initial),
                                    lte: HandleUTCDate(final)
                                },
                            },
                            {
                                OR: filters
                            }
                        ]
                    }
                }),
                prisma.orders.count({
                    where: {
                        AND: [
                            {
                                created_at: {
                                    gte: HandleUTCDate(initial),
                                    lte: HandleUTCDate(final)
                                },
                            },
                            {
                                OR: filters
                            }
                        ]
                    }
                })
            ])


            return res.status(200).json({
                order,
                count
            })

        } catch (error) {
            console.log({ error })
            return res.status(400).json({ message: error })
        }
    }

    async query(req, res) {
        const schema = yup.object().shape({
            dates: yup.string().required(),

            take: yup.string().required(),
            skip: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
            query: yup.string().required(),
            typeFilter: yup.array().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { take, skip, orderBy, query, dates, orderFor, typeFilter } = req.body

            const [initial, final] = dates.split("~")

            const skipParsed = parseInt(skip)
            const takeParsed = parseInt(take)

            const filters = typeFilter.map(res => {
                const bools = {
                    "Sim": true,
                    "Não": false
                }
                if (res.label.includes("DATA")) {
                    const [initialValue, finalValue] = res.value.split("~")

                    return {
                        [res.key]: {
                            gte: HandleUTCDate(initialValue),
                            lte: HandleUTCDate(finalValue)
                        }

                    }
                }
                return {
                    [res.key]: {
                        equals: !bools[res.value] ? res.value : bools[res.value],

                    }
                }
            })


            const [order, count] = await prisma.$transaction([
                prisma.order.findMany({
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    take: takeParsed,
                    skip: skipParsed,

                    where: {
                        AND: [
                            {
                                created_at: {
                                    gte: HandleUTCDate(initial),
                                    lte: HandleUTCDate(final)
                                }
                            },
                            {
                                AND: [
                                    {
                                        OR: [

                                            {
                                                name: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                            {
                                                student: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                            {
                                                unity: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                            {
                                                book: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                        ]
                                    },
                                    ...filters
                                ]
                            },

                        ]
                    }
                }),
                prisma.order.count({
                    where: {
                        AND: [
                            {
                                created_at: {
                                    gte: HandleUTCDate(initial),
                                    lte: HandleUTCDate(final)
                                }
                            },
                            {
                                AND: [
                                    {
                                        OR: [

                                            {
                                                name: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                            {
                                                student: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                            {
                                                unity: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                            {
                                                book: {
                                                    contains: query,
                                                    mode: "insensitive"
                                                }
                                            },
                                        ]
                                    },
                                    ...filters
                                ]
                            },

                        ]

                    }
                })
            ])

            return res.status(200).json({
                order,
                count
            })

        } catch (error) {
            console.log({ error })
            return res.status(400).json({ message: error })
        }
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

                await Promise.all([
                    prisma.orders.create({
                        data: {
                            unity,
                            id: data.id,
                            sku: data.sku,
                            name: data.nome,
                            value: data.valor,
                            student: data.aluno,
                            phone: data.tel,
                            book: data.materialDidatico,
                            link: "",
                            removedBy: "",
                        }
                    }),
                    prisma.weekOrder.create({
                        data: {
                            code,
                            orders: {
                                create: data
                            },
                            unity
                        }
                    })])

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

                const searchOnDb = await prisma.orders.findFirst({
                    where: {
                        OR: [
                            {
                                id: {
                                    contains: order.id
                                }
                            },
                            {
                                aluno: order.aluno,
                                materialDidatico: order.materialDidatico,
                            }
                        ]

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

                    weekOrder ?
                        await update(weekOrder.id, orders) :
                        await creation(code, orders)
                }
            }


        } catch (error) {
            console.log(error)
            throw new Error(error);

            // return res.status(400).json({ message: error })
        }
    }

    async update(req, res) {

        const nullable = (value) => {
            return !value || value === 'null' ?
                undefined : value
        }

        const schema = yup.object().shape({
            id: yup.string().required(),
            link: yup.string(),
            type: yup.string(),
            removedBy: yup.string(),
            status: yup.string(),

            tags: yup.array(),
            logistic: yup.array(),
            logs: yup.array(),
            observations: yup.array(),

            arrived: yup.bool(),
            signed: yup.bool(),
            available: yup.bool(),
            delivery: yup.bool(),

            arrivingDate: yup.date().transform(nullable), // ambos devem ser feitos automatico
            withdraw: yup.date().transform(nullable),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { withdraw, arrivingDate, id, link, type, removedBy,
                status, tags, logistic, logs, arrived, signed, delivery, available, responsible, observations } = req.body


            await Promise.all([
                _store(responsible, "pedido de livro",
                    `Pedido de livros editado por ${responsible}`, id),
            ])

            const response = await prisma.orders.update({
                where: {
                    id
                },
                data: {
                    link, type, removedBy, status, tags, logistic,
                    arrived, signed, delivery, available,

                    arrivingDate,
                    withdraw,
                    observations,

                    logs,
                },
            })


            return res.status(201).json(response)

        } catch (error) {
            console.log({ message: error })
            return res.status(500).json({ message: error.errors })
        }
    }

    async updateManyOrders(req, res) {

        const schema = yup.object().shape({
            ids: yup.array().required(),
            responsible: yup.string().required(),
            where: yup.string().required(),
            what: yup.string().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { ids, responsible, where, what } = req.body

            const dateTypes = {
                delivery: "withdraw",
                arrived: "arrivingDate",
                type: "arrivingDate"
            }

            const dateType = dateTypes[where]

            const data = dateType ?
                {
                    [where]: what,
                    [dateType]: new Date(),

                } :
                {
                    [where]: what,
                }

            for (let index = 0; index < ids.length; index++) {
                const id = ids[index];

                const { name } = await prisma.orders.findUnique({
                    where: {
                        id
                    }
                })


                await Promise.all([
                    _store(responsible,
                        "pedido de livro",
                        `${responsible} alterou o campo ${where} para ${what} referente ao pedido de livro em nome de ${name}`,
                        ""
                    ),
                    prisma.orders.update({
                        where: {
                            id
                        },
                        data: {
                            ...data,
                            logs: {
                                push: {
                                    responsible: responsible,
                                    description: `alterou o campo ${where} para ${JSON.stringify(what)}`
                                }
                            }
                        }
                    })
                ])

            }



            return res.status(201).send()
        } catch (error) {
            console.log(error)
            return res.status(500).json(error)
        }
    }

    async delete(req, res) {
        const schemaParams = yup.object().shape({
            id: yup.string().required(),
        })
        const schemaQuery = yup.object().shape({
            responsible: yup.string().required(),
        })

        try {
            await schemaParams.validateSync(req.params, { abortEarly: false })
            await schemaQuery.validateSync(req.query, { abortEarly: false })


            const { id } = req.params
            const { responsible } = req.query

            const { name } = await prisma.orders.findUnique({
                where: {
                    id
                }
            })

            await Promise.all([
                _storeLog(responsible, "pedido de livro", `${responsible} deletou o pedido de livro em nome de ${name}`, ""),
                prisma.orders.delete({
                    where: {
                        id
                    }
                })
            ])


            return res.status(200).send()
        } catch (error) {
            console.log(error)
            return res.status(500).json(error)
        }
    }
    async deleteManyOrders(req, res) {
        const schemaParams = yup.object().shape({
            id: yup.string().required(),
        })
        const schemaQuery = yup.object().shape({
            responsible: yup.string().required(),
        })

        try {
            await schemaParams.validateSync(req.params, { abortEarly: false })
            await schemaQuery.validateSync(req.query, { abortEarly: false })


            const { id } = req.params
            const { responsible } = req.query

            const { name } = await prisma.order.findUnique({
                where: {
                    id
                }
            })

            await Promise.all([
                _storeLog(responsible, "pedido de livro", `${responsible} deletou o pedido de livro em nome de ${name}`, ""),
                prisma.order.delete({
                    where: {
                        id
                    }
                })
            ])


            return res.status(200).send()
        } catch (error) {
            console.log(error)
            return res.status(500).json(error)
        }
    }

    async sendEmail(req, res) {

    }


    //     async edit(req, res) {
    //         const schema = yup.object().shape({

    //             id: yup.string().required(),
    //             responsible: yup.string().required()

    //         })

    //         try {
    //             await schema.validateSync(req.body, { abortEarly: false })

    //         } catch (error) {
    //             return res.status(400).json({ message: error })
    //         }

    //         const { id, responsible } = req.body


    //         try {
    //             await prisma.books.delete({
    //                 where: {
    //                     id
    //                 }
    //             })



    //             await _storeLog(responsible, "Pedido", "Deletado", id)

    //             if (res) return res.status(201).json({ message: "Pedido removido com sucesso" })
    //             console.log("Pedido editado")

    //         } catch (error) {

    //             console.log(error)
    //             return res.status(400).json({ message: error })

    //         }

    //     }

    //     async putDataOrders(req, res) {
    //         const schema = yup.object().shape({
    //             where: yup.string().required(),
    //             value: yup.string(),
    //             order: yup.array().required().of(yup.string())
    //         })

    //         try {
    //             await schema.validateSync(req.body, { abortEarly: false })

    //         } catch (error) {
    //             console.log(error)
    //             return res.status(400).json({ message: error })
    //         }

    //         const { where, value, order } = req.body

    //         //orders é um array de ids dos pedidos 

    //         try {

    //             for (let index = 0; index < order.length; index++) {
    //                 const bookId = order[index];

    //                 await prisma.books.update({
    //                     where: {
    //                         id: bookId
    //                     },
    //                     data: {
    //                         [where]: value
    //                     },
    //                     include: {
    //                         orderRelated: true
    //                     }
    //                 })
    //                     .then(async response => {
    //                         const { orderId, orderRelated, ...rest } = response

    //                         if (where === "dataRetirada") await CompleteCheckPointOnTrello(
    //                             rest,
    //                             orderRelated.unity,
    //                             "Material Didático/Confirmação de retirada pelo aluno ou responsável")

    //                         if (where === "chegada" && value) {
    //                             await CompleteCheckPointOnTrello(
    //                                 rest,
    //                                 orderRelated.unity,
    //                                 "Material Didático/Confirmação de disponibilidade para retirada do material na escola")


    //                             const unityNumber = {
    //                                 "Golfinho Azul": "31 8713-7018",
    //                                 'PTB': "31 8713-7018",
    //                                 'Centro': "31 8284-0590"
    //                             }

    //                             if ("tel" in rest) await SendSimpleWpp(rest.nome, rest.tel,
    //                                 `Olá *${rest.nome}*, 
    // Temos uma ótima notícia, o seu material didático: 

    // > ${rest.materialDidatico}

    // já está disponível para retirada em nossa unidade. 

    // Qualquer dúvida, entre em contato com o nosso whatsapp pedagógico através do número da unidade 

    // > ${response.unity} : ${unityNumber[response.unity]}.

    // Atenciosamente, equipe American Way.
    // FAVOR NÃO RESPONDER ESTA MENSAGEM 🗽.`)

    //                         }
    //                     })
    //             }

    //             return res.status(201).json({ message: "link atribuido com sucesso" })

    //         } catch (error) {
    //             console.log(error)
    //             return res.status(201).json({ message: error })
    //         }



    //     }



}

export default new OrderController