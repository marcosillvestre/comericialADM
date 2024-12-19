
import prisma from "../../../database/database.js"

class CustomFieldsController {
    async index(req, res) {
        try {
            const response = await prisma.customFields.findMany({
                orderBy: {
                    order: "asc"
                }
            })

            return res.status(200).json(response)
        } catch (error) {
            return res.status(400).json({ error })
        }
    }

    async store(req, res) {
        const { name, type, required, options } = req.body

        const findLastIndex = await prisma.customFields.findMany()
        let index = Math.max(...findLastIndex.map(response => response.order))


        const createCustomField = await prisma.customFields.create({
            data: {
                name,
                type,
                order: index + 1,
                required,
                options,
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
        const { id, category } = req.body

        try {
            await prisma.customFields.update({
                where: {
                    id
                },
                data: {
                    category
                }
            })

            return res.status(200).json({ message: "Success" })
        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "Error" })
        }

    }

    async delete(req, res) {
        const { id } = req.params
        const { responsible } = req.query
        try {


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

        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "Something went wrong" })
        }
    }

}

export default new CustomFieldsController()