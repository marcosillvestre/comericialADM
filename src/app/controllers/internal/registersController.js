
import * as yup from 'yup'
import prisma from "../../../database/database.js"
import { HandleUTCDate } from '../../../utils/functions/DateTransformer.js'
class RegistersController {
    async index(req, res) {

        const schema = yup.object().shape({
            dates: yup.string().required(),
            role: yup.string().required(),

            skip: yup.string().required(),
            take: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),

            dateType: yup.string(),
            typeFilter: yup.array(),
            path: yup.string()

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { role, name, dates, skip, take, orderBy, orderFor, typeFilter } = req.body

            const skipParsed = parseInt(skip)
            const takeParsed = parseInt(take)

            const filters = typeFilter.map(res => {
                const bools = {
                    "Sim": true,
                    "Não": false
                }

                if (res.customField) {
                    return {
                        customFields: {
                            path: [res.key],
                            string_contains: res.value,
                        },
                    }
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


            const [initial, final] = dates.split("~")

            const comercial = async () => {
                const [registers, total] = await prisma.$transaction([

                    prisma.registers.findMany({
                        include: {
                            historic: true,
                            files: true
                        },
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
                                    owner: {
                                        contains: name,
                                        mode: "insensitive"
                                    }

                                },
                                ...filters
                            ],
                        },

                    }),
                    prisma.registers.count({
                        where: {
                            AND: [
                                {
                                    created_at: {
                                        gte: HandleUTCDate(initial),
                                        lte: HandleUTCDate(final)
                                    },

                                },
                                {
                                    owner: {
                                        contains: name,
                                        mode: "insensitive"
                                    }

                                },
                                ...filters
                            ],
                        },
                    }
                    )
                ])
                return await { registers, total }
            }

            const admiministrative = async () => {
                const [registers, total] = await prisma.$transaction([

                    prisma.registers.findMany({

                        include: {
                            historic: true,
                            files: true

                        },
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
                                ...filters
                            ],
                        },
                    }),

                    prisma.registers.count({
                        where: {
                            AND: [
                                {
                                    created_at: {
                                        gte: HandleUTCDate(initial),
                                        lte: HandleUTCDate(final)
                                    },

                                },
                                ...filters
                            ],
                        },
                    })

                ])
                return await { registers, total }
            }

            const { registers, total } = role === "comercial" ?
                await comercial() :
                await admiministrative()

            return res.status(200).json({
                registers,
                total
            })
        } catch (error) {
            console.log({ error })
            return res.status(400).json(error.errors)
        }
    }

    async store(req, res) {
        const contractArray = req.body

        let acc = {}

        for (let i = 0; i < contractArray.length; i++) {
            if (contractArray[i].label === "name" || contractArray[i].label === "user") {
                acc[contractArray[i].label] = contractArray[i].value
                // return
            } else {

                acc["customFields"] = acc["customFields"] ?
                    { ...acc["customFields"], [contractArray[i].label]: contractArray[i].value } :
                    { [contractArray[i].label]: contractArray[i].value }
            }

        }

        const { name, user, customFields } = acc


        const { id } = await prisma.logs.findFirst({
            where: {
                name: {
                    contains: user
                }
            }
        })


        await prisma.contracts.create({
            data: {
                name: name,
                customFields: customFields,
                user: {
                    connect: {
                        id: id
                    }
                }
            }
        })
            .then(r => console.log(r))
            .catch(r => console.log(r))


        return res.status(201).json({ message: "Success" })


    }

    async multiUpdates(req, res) {
        const { registerUpdate, responsible, updates } = req.body
        const { id } = req.params

        const schema = yup.object().shape({
            registerUpdate: yup.object(),
            updates: yup.object(),
            responsible: yup.object()
        }).required()


        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const keys = Object.keys(updates)
            const values = Object.values(updates)


            const register = await prisma.registers.findUnique({
                where: {
                    id
                }
            })

            const text = {
                observacao: "Foi adicionado uma nova observação"
            }


            const imutable = {
                ...registerUpdate,
                admResponsavel: responsible.name,
                historic: {
                    createMany: {
                        data:
                            keys.map((area, index) => {
                                return {
                                    responsible: responsible.name,
                                    information: {
                                        field: area,
                                        text: text[area] ?? `O campo ${area} foi alterado para ${values[index]}`,
                                        from: id,
                                    }
                                }
                            })
                    }
                }
            }

            const validating = imutable['comissaoStatus'] === "Comissionado" ||
                register['comissaoStatus'] === "Aprovado"

            const automations = {
                "Comissionado": "dataComissionamento",
                "Aprovado": "dataValidacao",
            }
            const validated = {
                ...imutable,
                [automations[imutable['comissaoStatus']]]: new Date().toISOString()
            }


            const response = await prisma.registers.update({
                where: {
                    id
                },
                data: validating ?
                    validated :
                    imutable
            })

            return res.status(201).json(response)

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: error })
        }
    }
    async update(req, res) {
        const { key, area, value, responsible } = req.body
        const { id } = req.params

        const schema = yup.object().shape({
            area: yup.string().required(),
            responsible: yup.object().shape({
                name: yup.string().required(),
                role: yup.string().required(),
            })
        }).required()

        const validating = key === 'comissaoStatus' &&
            value === "Comissionado" ||
            value === "Aprovado"

        const automations = {
            "Comissionado": "dataComissionamento",
            "Aprovado": "dataValidacao"
        }

        const text = {
            observacao: "Foi adicionado uma nova observação"
        }

        const imutable = {
            [area]: value,
            admResponsavel: responsible.name,
            historic: {

                create: {
                    responsible: responsible.name,
                    information: {
                        field: key,
                        text: text[key] ?? `O campo ${area} foi alterado para ${value}`,
                        from: id,
                    }
                }
            }
        }

        const validated = {
            ...imutable,
            [automations[value]]: new Date().toISOString()
        }



        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const response = await prisma.registers.update({
                where: {
                    id
                },
                data: validating ?
                    validated :
                    imutable
            })


            return res.status(201).json(response)

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: error })
        }
    }

    async delete(req, res) {
        const { id } = req.params
        const { responsible } = req.query

        const deleteData = async () => {
            await prisma.logHistoric.deleteMany({
                where: {
                    registerId: id
                }
            })
                .then(async res => {

                    await prisma.registers.delete({ where: { id: id } })
                })




        }

        const historic = async () => {
            return new Promise(resolve => {
                resolve(prisma.historic.create({
                    data: {
                        responsible: responsible,
                        information: {
                            field: "Registro",
                            to: "Deletado",
                            from: id,
                        }
                    }
                })
                )
            })
        }

        await Promise.all([
            deleteData(),
            historic()
        ])
            .then(() => {
                return res.status(201).json({ message: "Deleted" })

            })
            .catch(() => {
                return res.status(400).json({ message: "Something went wrong" })
            })
    }

    async query(req, res) {
        const schema = yup.object().shape({
            dates: yup.string().required(),
            role: yup.string().required(),

            skip: yup.string().required(),
            take: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
            query: yup.string().required(),

            dateType: yup.string(),
            typeFilter: yup.array(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { role, name, dates, skip, take, orderBy, orderFor, typeFilter, query } = req.body

            const skipParsed = parseInt(skip)
            const takeParsed = parseInt(take)

            const [initial, final] = dates.split("~")

            const filters = typeFilter.map(res => {
                const bools = {
                    "Sim": true,
                    "Não": false
                }

                if (res.customField) {
                    return {
                        customFields: {
                            path: [res.key],
                            string_contains: res.value,
                        },
                    }
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


            const comercial = async () => {
                const [registers, total] = await prisma.$transaction([

                    prisma.registers.findMany({
                        include: {
                            historic: true,
                            files: true

                        },

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
                                    owner: {
                                        contains: name,
                                        mode: "insensitive"
                                    },
                                },
                                ...filters

                            ],
                            OR: [
                                {
                                    name: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    customFields: {
                                        path: ['Nome do aluno'],
                                        string_contains: query,
                                    }
                                },

                            ]
                        },

                    }),
                    prisma.registers.count({
                        where: {
                            AND: [

                                {
                                    created_at: {
                                        gte: HandleUTCDate(initial),
                                        lte: HandleUTCDate(final)
                                    },
                                },
                                {
                                    owner: {
                                        contains: name,
                                        mode: "insensitive"
                                    },
                                },
                                ...filters

                            ],
                            OR: [
                                {
                                    name: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    customFields: {
                                        path: ['Nome do aluno'],
                                        string_contains: query,
                                    }
                                },

                            ]
                        },
                    }
                    )
                ])
                return await { registers, total }
            }

            const admiministrative = async () => {
                const [registers, total] = await prisma.$transaction([

                    prisma.registers.findMany({
                        include: {
                            historic: true,
                            files: true

                        },
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
                                ...filters

                            ],
                            OR: [
                                {
                                    name: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    customFields: {
                                        path: ['Nome do aluno'],
                                        string_contains: query,
                                    }
                                },

                            ]
                        },
                    }),

                    prisma.registers.count({
                        where: {
                            AND: [

                                {
                                    created_at: {
                                        gte: HandleUTCDate(initial),
                                        lte: HandleUTCDate(final)
                                    },
                                },
                                ...filters

                            ],
                            OR: [
                                {
                                    name: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    customFields: {
                                        path: ['Nome do aluno'],
                                        string_contains: query,
                                    }
                                },

                            ]
                        },
                    })

                ])
                return await { registers, total }
            }

            const { registers, total } = role === "comercial" ?
                await comercial() :
                await admiministrative()

            return res.status(200).json({
                registers,
                total
            })
        } catch (error) {
            console.log({ error })
            return res.status(400).json(error.errors)
        }
    }

    async getRegisterById(req, res) {
        const schema = yup.object().shape({
            id: yup.string().required(),
        })

        try {
            await schema.validateSync(req.params, { abortEarly: false })
            const { id } = req.params;


            const deal = await prisma.registers.findUnique({
                include: {
                    historic: {
                        orderBy: {
                            created_at: "desc"
                        }
                    },
                    files: {
                        orderBy: {
                            created_at: "desc"
                        }
                    },

                },
                where: {
                    id
                }
            })

            return res.status(200).json({
                register: deal
            })

        } catch (error) {
            console.log({ error })
            return res.status(400).json(error.errors)
        }
    }
}

export default new RegistersController()