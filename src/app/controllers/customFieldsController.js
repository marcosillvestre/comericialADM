
import prisma from "../../database/database.js"

class CustomFieldsController {
    async index(req, res) {
        try {
            const response = await prisma.customFields.findMany()
            return res.status(200).json(response)
        } catch (error) {
            return res.status(400).json({ error })
        }
    }

    async store(req, res) {
        const { label, type, required, options, for: goal } = req.body

        const findLastIndex = await prisma.customFields.findMany()
        let index = Math.max(...findLastIndex.map(response => response.order))


        const createCustomField = await prisma.customFields.create({
            data: {
                label,
                type,
                order: index + 1,
                required,
                options,
                for: goal
            }
        })

        new Promise(resolve => {
            resolve(createCustomField)
        })
            .then(() => {
                return res.status(201).json({ message: "Success" })
            })


    }

    async update(req, res) {
        const { id, field, value, updateOptionType } = req.body


        if (updateOptionType) {
            const { id: optionId, data } = updateOptionType
            await prisma.customFields.update({
                where: { id: optionId },
                data: {
                    options: data
                }
            })
                .then((e) => {
                    return res.status(201).json({ message: "Success" })
                })
                .catch((err) => {
                    return res.status(201).json({ message: err })
                })
        }

        try {
            const update = async (int) => {
                await prisma.customFields.update({
                    where: { id: id },
                    data: {
                        [field]: int === undefined ? value : int
                    }
                })
                    .then(() => console.log("Done"))
            }

            const updateOrder = async () => {
                const cfToChange = await prisma.customFields.findFirst({
                    where: { id: id }
                })

                const cfAffected = await prisma.customFields.findFirst({
                    where: { order: parseInt(value) }
                })

                if (cfAffected) {
                    return await prisma.customFields.update({
                        where: { id: cfAffected.id },
                        data: {
                            order: parseInt(cfToChange.order)
                        }
                    }).then(async () => {
                        await prisma.customFields.update({
                            where: { id: cfToChange.id },
                            data: {
                                order: parseInt(value)
                            }
                        })
                    })
                }

                update(parseInt(value))

            }
            new Promise(resolve => {
                if (field === "order") {
                    return resolve(updateOrder())
                }
                resolve(update())
            })
                .then(() => {
                    return res.status(201).json({ message: "Success" })
                })

        } catch (error) {
            console.log(error)

            return res.status(401).json(error)
        }
    }

    async delete(req, res) {
        const { id } = req.params
        const { responsible } = req.query

        const deleteData = async () => {
            return new Promise(resolve => {
                resolve(
                    prisma.customFields.delete({ where: { id: id } })
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

export default new CustomFieldsController()