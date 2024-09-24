import "dotenv/config";
import prisma from '../../database/database.js';

class Historic {
    async store(req, res) {
        const { responsible, information } = req.body

        try {
            await prisma.historic.create({
                data: {
                    responsible,
                    information
                }
            })
            return res.status(200).json({ message: "Success" })
        } catch (error) {
            return res.status(400).json({ message: "Somenthing went wrong" })
        }

    }
    async index(req, res) {

        const { take } = req.query
        try {
            const data = await prisma.historic.findMany({
                orderBy: {
                    date: "desc"
                },
                take: parseInt(take)
            })

            return res.status(200).json(data)

        } catch (error) {
            console.log(error)
            if (error) return res.status(400).json({ message: "Somenthing went wrong" })
        }

    }

    async indexPersonalHistoric(req, res) {
        const { contract } = req.query

        const { name } = await prisma.person.findUnique({
            where: {
                contrato: contract
            }
        })


        try {
            const personalHistoric = await prisma.historic.findMany({
                where: {

                    OR: [
                        {
                            information: {
                                path: ["from"],
                                string_contains: contract
                            }
                        },
                        {
                            responsible: {
                                contains: name,
                                mode: "insensitive"
                            }
                        }
                    ]
                }
            })

            return res.status(200).json(personalHistoric)

        } catch (err) {
            return res.status(400).json(err)
        }
    }
}
export default new Historic()