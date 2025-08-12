import * as yup from 'yup'
import prisma from '../../../database/database.js'


class BillingRulesController {
    async index(req, res) {

        const schema = yup.object().shape({

            take: yup.string().required(),
            skip: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
            typeFilter: yup.array().required(),

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { take, skip, orderBy, orderFor, typeFilter } = req.body

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
                        equals: bools[res.value] ?? res.value

                    }
                }
            })

            const [billing, total] = await prisma.$transaction([
                prisma.billings.findMany({
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    take: parseInt(take),
                    skip: parseInt(skip),
                    include: {
                        productsRelated: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        servicesRelated: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                    where: {
                        AND: [
                            ...filters
                        ]
                    }

                }),
                prisma.billings.count({
                    where: {
                        AND: [
                            ...filters
                        ]
                    }
                })
            ])


            return res.status(200).json({
                billing, total
            })

        } catch (error) {
            console.log({
                error,
                where: "[GET INDEX BILLINGS]"
            });

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ message: "Erro para trazer os dados" })
        }
    }

    async store(req, res) {
        const schema = yup.object().shape({
            name: yup.string().required(),
            description: yup.string().required(),
            reminderMethod: yup.object(),
            daysToAction: yup.number().required(),
            message: yup.string().required(),
            typeTrigger: yup.string().required(),
            category: yup.string().required(),
            related: yup.array(),
            status: yup.bool(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const {
                name,
                description,
                reminderMethod,
                daysToAction,
                message,
                typeTrigger,
                category,
                related,
                status,
            } = req.body


            const relatedKey = category === 'Product' ? 'productsRelated' : 'servicesRelated'

            const rule = await prisma.billings.create({
                data: {
                    name,
                    description,
                    reminderMethod,
                    daysToAction,
                    message,
                    typeTrigger,
                    category,
                    status,
                    [relatedKey]: {
                        connect: related
                    }
                },
            })

            return res.status(201).json(rule)
        } catch (error) {

            console.log(error)
            return res.status(400).json({ error })
        }
    }

    async update(req, res) {
        const { id } = req.params
        const schema = yup.object().shape({
            name: yup.string().required(),
            description: yup.string().required(),
            reminderMethod: yup.object(),
            daysToAction: yup.number().required(),
            message: yup.string().required(),
            typeTrigger: yup.string().required(),
            category: yup.string().required(),
            related: yup.array(),
            status: yup.bool(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const {
                name,
                description,
                reminderMethod,
                daysToAction,
                message,
                typeTrigger,
                category,
                related,
                status,
            } = req.body


            const relatedKey = category === 'Product' ? 'productsRelated' : 'servicesRelated'

            const rule = await prisma.billings.update({
                where: {
                    id
                },
                data: {
                    name,
                    description,
                    reminderMethod,
                    daysToAction,
                    message,
                    typeTrigger,
                    category,
                    status,
                    [relatedKey]: {
                        set: []
                    }
                },

            }).then(async () => {
                await prisma.billings.update({
                    where: {
                        id
                    },
                    data: {
                        name,
                        description,
                        reminderMethod,
                        daysToAction,
                        message,
                        typeTrigger,
                        category,
                        status,
                        [relatedKey]: {
                            connect: related
                        }
                    },
                })
            })

            return res.json(rule)

        } catch (error) {

            console.log(error)
            return res.status(400).json({ error })
        }
    }

    async delete(req, res) {
        const { id } = req.params

        try {
            await prisma.billings.update({
                where: { id },
                data: {
                    productsRelated: {
                        set: []
                    },
                    servicesRelated: {
                        set: []
                    }
                }
            })
                .then(async () => {

                    await prisma.billings.delete({
                        where: { id },
                    })
                })

            return res.status(204).send()
        } catch (error) {
            return res.status(400).json({ error })
        }
    }
}

export default new BillingRulesController()
