
import prisma from "../../database/database.js"

class ContractsController {
    async index(req, res) {
        try {
            const response = await prisma.contracts.findMany()
            return res.status(200).json(response)
        } catch (error) {
            return res.status(200).json(response)
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

export default new ContractsController()