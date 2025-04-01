import { HandleUTCDate } from "../../../config/DateTransformer.js";
import { PastCodes } from "../../../config/getLastMonday.js";

import prisma from "../../../database/database.js";
import { Historic } from '../../../database/historic/properties.js';
import { SendSimpleWpp } from '../../connection/externalConnections/wpp.js';

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

            const [request, total] = await prisma.$transaction([
                prisma.requests.findMany({
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    take: takeParsed,
                    skip: skipParsed,
                    include: {
                        unity: true,
                        suplier: true,
                        orders: true
                    },
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
                                AND: filters
                            }
                        ]
                    }
                })
            ])


            return res.status(200).json({
                request,
                total
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
                    id: yup.string().required(),
                    phone: yup.string().nullable(),
                    student: yup.string().nullable(),
                    link: yup.string(),
                    name: yup.string().required(),
                    unity: yup.string().required(),
                    value: yup.number().required(),
                    arrived: yup.bool().required(),
                    signed: yup.bool().required(),
                    delivery: yup.bool().required(),
                    arrivingDate: yup.string().nullable(),
                    withdraw: yup.string().nullable(),
                    requestId: yup.string().nullable(),
                    available: yup.bool().required(),
                    removedBy: yup.string(),
                    book: yup.string().required(),
                    status: yup.string().required(),
                    type: yup.string().required(),
                    tags: yup.array().required(),
                    logistic: yup.array().required(),
                    logs: yup.array().required(),
                    observations: yup.array().required(),

                })
            ),
            message: yup.string().required("A mensagem é a forma que o fornecedor tem de saber qual seu pedido, é obrigatório!"),
            prevision: yup.number().required("Tempo de previsão de entrega é obrigatótio para a criação de pedidos"),
            wppPermission: yup.bool.required,
            emailPermission: yup.bool.required,
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { orders, message, prevision, suplier, responsible, wppPermission, emailPermission } = req.body

            const { contacts, name } = suplier



            const relatedUnity = await prisma.unities.findFirst({
                where: {
                    name: orders[0].unity
                }
            })
            const code = await getLastMondayCode(new Date());

            const ordersIds = orders.map(res => res.id)

            await prisma.$transaction([

                prisma.orders.updateMany({
                    where: {
                        id: {
                            in: ordersIds
                        }
                    },
                    data: {
                        status: 'ENVIADO',
                        logistic: {
                            push: {
                                active: true,
                                stage: 'ENVIADO',
                                date: new Date(),

                            }
                        }
                    }
                }),
                prisma.requests.create({
                    data: {
                        messageSent: message,
                        price: orders.reduce((acc, curr) => curr.value + acc, 0),
                        user: responsible,
                        orders: {

                            connect: ordersIds.map(res => {
                                return {
                                    id: res
                                }
                            })
                        },
                        codeRequest: code,
                        prevision: parseInt(prevision),
                        unity: {
                            connect: {
                                id: relatedUnity.id
                            }
                        },
                        suplier: {
                            connect: {
                                id: suplier.id
                            }
                        },
                    }
                })
            ])


            if (wppPermission) await SendSimpleWpp(
                name,
                contacts?.whatsapp,
                message
            )

            // if (emailPermission) 

            return res.status(200).send()

        } catch (error) {
            console.log({
                where: "[REQUEST.CREATE]",
                error
            })
            return res.status(400).json({ message: error.errors })
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


// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// const requestSchema = yup.object().shape({
//     suplierID: yup.string().required(),
//     codeRequest: yup.string().required(),
//     price: yup.number().required(),
//     unityId: yup.string().required(),
//     messageSent: yup.string().required(),
//     user: yup.string().required()
// });

// class RequestsController {
//     static async create(req, res) {
//         try {
//             await requestSchema.validate(req.body);
//             const request = await prisma.requests.create({ data: req.body });
//             res.status(201).json(request);
//         } catch (error) {
//             res.status(400).json({ error: error.message });
//         }
//     }

//     static async getAll(req, res) {
//         try {
//             const requests = await prisma.requests.findMany();
//             res.json(requests);
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     }

//     static async getById(req, res) {
//         try {
//             const request = await prisma.requests.findUnique({
//                 where: { id: req.params.id }
//             });
//             if (!request) return res.status(404).json({ error: "Request not found" });
//             res.json(request);
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     }

//     static async update(req, res) {
//         try {
//             await requestSchema.validate(req.body);
//             const request = await prisma.requests.update({
//                 where: { id: req.params.id },
//                 data: req.body
//             });
//             res.json(request);
//         } catch (error) {
//             res.status(400).json({ error: error.message });
//         }
//     }

//     static async delete(req, res) {
//         try {
//             await prisma.requests.delete({ where: { id: req.params.id } });
//             res.status(204).send();
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     }
// }

// export default RequestsController;
