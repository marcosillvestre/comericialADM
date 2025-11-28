import { HandleUTCDate } from "../../../utils/functions/DateTransformer.js";
import { PastCodes } from "../../../utils/functions/getLastMonday.js";

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
                if (res.label.includes("TAG")) {
                    return {
                        [res.key]: {
                            contains: res.value,
                            mode: "insensitive"
                        }
                    }
                }

                return {
                    [res.key]: {
                        equals: bools[res.value] === undefined ?
                            res.value : bools[res.value],

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
                                AND: filters
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
                                AND: filters
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
            console.log({
                where: '[ORDERS.GET]',
                error
            })
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
                prisma.orders.count({
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
            console.log({
                where: '[ORDERS.QUERY]',
                error
            })
            return res.status(400).json({ message: error })
        }
    }


    async storeMany(req, res) {
        const schema = yup.object().shape({
            orders: yup.array().required(),
            unity: yup.string().required()

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })
            const { orders, unity } = req.body

            const date = new Date()
            const code = await getLastMondayCode(date);


            // console.log({ orders })

            orders.map(async r => {
                await prisma.orders.create({
                    data: {
                        ...r,
                        unity,
                        logistic: [
                            {
                                name: "REVISAR",
                                active: true
                            }
                        ]
                    }
                })
                    .then(t => console.log(t.name + " foi adicionado ao sistema de livros"))
                    .catch(t => {
                        if (t.meta?.target[0] === 'id') return
                        console.log(t)
                    })

            })


        } catch (error) {
            console.log({
                where: '[ORDERS.STOREMANY]',
                error
            })

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
            console.log({
                where: '[ORDERS.UPDATE]',
                error
            })
            return res.status(500).json({ message: error.errors })
        }
    }

    async updateManyOrders(req, res) {

        const schema = yup.object().shape({
            ids: yup.array().required(),
            responsible: yup.string().required(),
            where: yup.string().required(),
            what: yup.string().required(),
            logistic: yup.array()
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { ids, responsible, where, what } = req.body

            const dateTypes = {
                delivery: {
                    status: 'ENTREGUE',
                    "withdraw": new Date(),
                    logistic: {
                        push: {
                            stage: "ENTREGUE",
                            active: true,
                            date: new Date()
                        }
                    }
                },
                arrived: {
                    status: 'CHEGOU',
                    "arrivingDate": new Date(),
                    logistic: {
                        push: {
                            stage: "CHEGOU",
                            active: true,
                            date: new Date()
                        }
                    }
                },
                available: {
                    status: 'DISPONIVEL',
                    logistic: {
                        push: {
                            stage: "DISPONIVEL",
                            active: true,
                            date: new Date()
                        }
                    }
                },
                status: {
                    [where]: what,
                    logistic: {
                        push: {
                            stage: what,
                            active: true,
                            date: new Date()
                        }
                    }
                },
                signed: {
                    signed: true,
                },
            }

            const data = dateTypes[where] ?? { [where]: what }

            for (let index = 0; index < ids.length; index++) {
                const id = ids[index];

                const { name } = await prisma.orders.findUnique({
                    where: {
                        id
                    }
                })

                const translate = {
                    link: "Link",
                    unity: "Unidade",
                    value: "Valor",
                    arrived: "Chegada",
                    arrivingDate: "Data de chegada",
                    signed: "Assinatura",
                    available: "Disponível",
                    delivery: "Entregue",
                    withdraw: "Data de retirada",
                    removedBy: "Retirado por",
                    book: "Produto",
                    status: "Status",
                    type: "Tipo",
                    tags: "Tag",
                    logistic: "Sequência logística",
                    logs: "Sequência de logs",
                    observations: "Observações",
                    true: "Sim",
                    false: "Não"
                }

                await Promise.all([
                    _store(responsible,
                        "pedido de livro",
                        `${responsible} alterou o campo de ${translate[where]} para ${translate[what] ?? what} referente ao pedido de livro em nome de ${name}`,
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
                                    description: `alterou o campo de ${translate[where]} para ${translate[what] ?? what}`,
                                    date: new Date()
                                }
                            }
                        }
                    })
                ])

            }



            return res.status(201).send()
        } catch (error) {
            console.log({
                where: '[ORDERS.UPDATEMANY]',
                error
            })
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

            const order = await prisma.orders.findUnique({
                where: {
                    id
                }
            })

            await Promise.all([
                _store(responsible, "pedido de livro", `${responsible} deletou o pedido de livro em nome de ${order.name}`, ""),
                prisma.orders.delete({
                    where: {
                        id
                    }
                })
            ])


            return res.status(200).send()
        } catch (error) {
            console.log({
                where: '[ORDERS.DELETE]',
                error
            })
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
            console.log({
                where: '[ORDERS.DELETEMANY]',
                error
            })
            return res.status(500).json(error)
        }
    }

    async orderProducts(req, res) {
        const schema = yup.object().shape({

        })


    }



}

export default new OrderController