
import * as yup from 'yup'
import prisma from "../../../database/database.js"
class RegistersController {
    async index(req, res) {

        const { range, role, name, dates, skip, take } = req.query

        const schema = yup.object().shape({
            range: yup.string().required(),
            role: yup.string().required(),
            name: yup.string().required(),
            dates: yup.string().required(),
            skip: yup.string().required(),
            take: yup.string().required(),

        })

        try {
            await schema.validateSync(req.query, { abortEarly: false })

        } catch (error) {
            return res.status(400).json({ message: error })
        }
        const skipParsed = parseInt(skip)
        const takeParsed = parseInt(take)

        const [initial, final] = dates.split("~")

        try {
            const comercial = async () => {
                const response = await prisma.registers.findMany({
                    where: {
                        created_at: {
                            gte: initial,
                            lte: final
                        },
                        owner: {
                            contains: name,
                            mode: "insensitive"
                        }
                    },
                    include: {
                        historic: true
                    },
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: takeParsed,
                    skip: skipParsed,
                })
                return await response
            }

            const admiministrative = async () => {
                const response = await prisma.registers.findMany({
                    where: {
                        created_at: {
                            gte: new Date(initial),
                            lte: new Date(final)
                        }
                    },
                    include: {
                        historic: true
                    },
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: takeParsed,
                    skip: skipParsed,
                })
                return await response
            }

            const response = role === "comercial" ? await comercial() : await admiministrative()

            return res.status(200).json({
                period: range,
                total: response.length,
                deals: response
            })
        } catch (error) {
            console.log(error)
            return res.status(200).json(error)
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

    async update(req, res) {
        const { } = req.body


        await prisma.contracts.update({
            where: { id: optionId },
            data: {
                options: data
            }
        })
            .then((e) => {
                return res.status(201).json({ message: "Success" })
            })
            .catch((err) => {
                return res.status(401).json({ message: err })
            })

        return res.status(201).json({ message: "Success" })
        return res.status(401).json(error)

    }

    async delete(req, res) {
        const { id } = req.params
        const { responsible } = req.query

        const deleteData = async () => {
            return new Promise(resolve => {
                resolve(
                    prisma.contracts.delete({ where: { id: id } })
                )
            })
        }

        const historic = async () => {
            return new Promise(resolve => {
                resolve(prisma.historic.create({
                    data: {
                        responsible: responsible,
                        information: {
                            field: "Campo personalizado",
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

}

export default new RegistersController()