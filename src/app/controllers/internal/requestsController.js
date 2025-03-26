import { DateTransformer, HandleUTCDate } from "../../../config/DateTransformer.js";
import { PastCodes } from "../../../config/getLastMonday.js";

import prisma from "../../../database/database.js";
import { Historic } from '../../../database/historic/properties.js';

const { _storeLog, _store } = new Historic()
const { getLastMondayCode } = new PastCodes()

import * as yup from 'yup';
class RequestsController {

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
                prisma.requests.findMany({
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
                prisma.requests.count({
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


                prisma.weekOrder.create({
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
                        // console.log(err)
                        if (res) return res.status(400).json({ err })
                    })
            }



            for (let index = 0; index < orders.length; index++) {
                const order = orders[index]

                const searchOnDb = await prisma.requests.findFirst({
                    where: {
                        OR: [
                            {
                                id: {
                                    contains: order.id
                                }
                            },
                            {
                                aluno: order.aluno,
                                book: order.materialDidatico,
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

                    orders.map(async data => {

                        await prisma.requests.create({
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
                                logistic: [
                                    {
                                        name: "REVISAR",
                                        active: true
                                    }
                                ]
                            }

                        })
                            .then(t => console.log(t.name + " foi adicionado ao sistema de livros"))
                            .catch(t => console.log(data.nome + " ja está cadastrada"))
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

            const order = await prisma.requests.findUnique({
                where: {
                    id
                }
            })

            await Promise.all([
                _store(responsible, "pedido de livro", `${responsible} deletou o pedido de livro em nome de ${order.name}`, ""),
                prisma.requests.delete({
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
}

export default new RequestsController