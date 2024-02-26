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
        try {
            const data = await prisma.historic.findMany({
                orderBy: {
                    date: "desc"
                }
            })

            console.log(data)
            return res.status(200).json(data)

        } catch (error) {
            console.log(error)
            if (error) return res.status(400).json({ message: "Somenthing went wrong" })
        }

    }
}
export default new Historic()