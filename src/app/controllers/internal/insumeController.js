import axios from 'axios';
import prisma from '../../../database/database.js';
class InsumeController {

    async index(req, res) {
        const { take, skip, category } = req.query
        try {
            const [Insumes, count] = await prisma.$transaction([
                prisma.insume.findMany({
                    where: {
                        category
                    },
                    take: parseInt(take),
                    skip: parseInt(skip),
                    orderBy: {
                        name: 'asc'
                    }
                }),
                prisma.insume.count({
                    where: {
                        category
                    }
                }),
            ])


            res.status(200).json({
                insumes: Insumes,
                total: count
            });
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: 'Failed to fetch Insumes' });
        }
    }

    async getAll(req, res) {
        try {
            const [Insumes, count] = await prisma.$transaction([
                prisma.insume.findMany({
                    orderBy: {
                        name: 'asc'
                    }
                }),
                prisma.insume.count(),
            ])


            res.status(200).json({
                insumes: Insumes,
                total: count
            });
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: 'Failed to fetch Insumes' });
        }
    }

    async store(req, res) {
        const { name, sku, price_selling, color, category } = req.body;

        try {
            await axios.get(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.MATERIAL_ID}?token=${process.env.RD_TOKEN}`)
                .then(async res => {

                    const options = res.data.opts

                    await axios.put(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.MATERIAL_ID}?token=${process.env.RD_TOKEN}`, {
                        opts: options.concat(name)
                    })

                })

            const increseTax = Math.ceil(price_selling * 0.25 + price_selling)
            const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
            const descreaseThird = Math.floor(increseTax - increseTax * 0.3)


            const newInsume = await prisma.insume.create({
                data: {
                    name,
                    sku,
                    price_selling,
                    color,
                    category,
                    price_ticket: increseTax,
                    price_card: descreaseTw,
                    price_cash: descreaseThird,
                }
            });

            res.status(201).json(newInsume);
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: 'Failed to create Insume' });
        }
    }

    async update(req, res) {
        const { id } = req.params;
        const { name, sku, price_selling, color } = req.body;

        const increseTax = Math.ceil(price_selling * 0.25 + price_selling)
        const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
        const descreaseThird = Math.floor(increseTax - increseTax * 0.3)

        try {


            const { name: stored } = await prisma.insume.findFirst({
                where: {
                    id
                }
            })


            if (stored !== name) {

                await axios.get(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.MATERIAL_ID}?token=${process.env.RD_TOKEN}`)
                    .then(async res => {

                        const options = res.data.opts.filter(res => res !== stored)

                        await axios.put(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.MATERIAL_ID}?token=${process.env.RD_TOKEN}`, {
                            opts: options.concat(name)
                        })

                    })
            }



            const updatedInsume = await prisma.insume.update({
                where: {
                    id
                },
                data: {
                    name,
                    sku,
                    price_selling,
                    color,
                    category,
                    price_ticket: increseTax,
                    price_card: descreaseTw,
                    price_cash: descreaseThird,
                },
            });
            res.status(200).json(updatedInsume);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update Insume' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        try {

            await prisma.insume.delete({
                where: {
                    id
                },
            })
                .then(async response => {
                    await axios.get(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.MATERIAL_ID}?token=${process.env.RD_TOKEN}`)
                        .then(async res => {

                            const options = res.data.opts

                            await axios.put(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.MATERIAL_ID}?token=${process.env.RD_TOKEN}`, {
                                opts: options.filter(r => r !== response.name)
                            })

                        })
                })


                ;
            res.status(204).send();
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: 'Failed to delete Insume' });
        }
    }
}

export default new InsumeController();
