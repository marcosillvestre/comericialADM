
import * as yup from 'yup'
import prisma from "../../../database/database.js"
import { createNewCustomField } from '../../connection/externalConnections/rdStation.js'
class CustomFieldsController {
    async index(req, res) {
        const schema = yup.object().shape({

            take: yup.string().required(),
            skip: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { take, skip, orderBy, orderFor } = req.body


            const [customFields, total] = await prisma.$transaction([
                prisma.customFields.findMany({
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    take: parseInt(take),
                    skip: parseInt(skip),
                }),
                prisma.customFields.count()
            ])


            return res.status(200).json({
                customFields, total
            })
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error })
        }
    }
    async indexFilter(req, res) {

        try {
            const [customFields, total] = await prisma.$transaction([
                prisma.customFields.findMany({
                    orderBy: {
                        order: "asc"
                    }
                }),
                prisma.customFields.count()
            ])


            return res.status(200).json({
                customFields, total
            });

        } catch (error) {
            console.log(error)
            return res.status(500).json({ error })
        }
    }

    async store(req, res) {
        const { name, type, required, options } = req.body

        const findLastIndex = await prisma.customFields.findMany()
        let index = Math.max(...findLastIndex.map(response => response.order))


        await createNewCustomField({
            name, type, required, options, order: index
        })
            .then(async () => {

                const response = await prisma.customFields.create({
                    data: {
                        name,
                        type,
                        order: index + 1,
                        required,
                        options,
                    }
                })

                return res.status(201).json(response)
            })
            .catch(err => {

                console.log(err)
                return res.status(400).json({ error: err })
            })



    }

    async update(req, res) {
        try {

            const { name, type, required, options } = req.body
            const { id } = req.params

            const response = await prisma.customFields.update({
                where: {
                    id
                },
                data: {
                    name, type, required, options
                }
            })

            return res.status(200).json(response);

        } catch (error) {
            console.log({
                where: '[CUSTOMFIELD.UPDATE]',
                error
            })

            return res.status(401).json(error)
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
            console.log({
                where: '[CUSTOMFIELD.DELETE]',
                error
            })
            return res.status(400).json({ message: "Something went wrong" })
        }
    }

}

export default new CustomFieldsController()