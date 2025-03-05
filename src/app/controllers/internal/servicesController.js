import { AplieDescount } from '../../../config/descountAplied.js';
import prisma from '../../../database/database.js';
class ServicesController {

    async index(req, res) {
        const { take, skip, orderBy, query } = req.query

        try {
            const withQuery = async () => {
                const [services, count] = await prisma.$transaction([
                    prisma.services.findMany({
                        where: {
                            OR: [
                                {
                                    name: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    sku: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                }
                            ]
                        },
                        take: parseInt(take),
                        skip: parseInt(skip),
                        orderBy: {
                            [orderBy]: "asc"
                        }
                    }),
                    prisma.services.count({
                        where: {
                            OR: [
                                {
                                    name: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    sku: {
                                        contains: query,
                                        mode: "insensitive"
                                    }
                                }
                            ]
                        },
                    })

                ])
                return { services, count }
            }
            const withoutQuery = async () => {
                const [services, count] = await prisma.$transaction([
                    prisma.services.findMany({
                        take: parseInt(take),
                        skip: parseInt(skip),
                        orderBy: {
                            [orderBy]: "asc"
                        }
                    }),
                    prisma.services.count()

                ])
                return { services, count }
            }



            const { services, count } = query ? await withQuery() :
                await withoutQuery()

            return res.status(200).json({
                services,
                total: count
            });

        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch Insumes' });
        }
    }

    async store(req, res) {
        const { name, sku, price_selling, color, status,
            workLoad, course, modality, duration } = req.body;

        try {


            const { decreaseFifteen, descreaseThird, descreaseTw, increseTax } = await AplieDescount(price_selling)

            const newInsume = await prisma.services.create({
                data: {
                    name,
                    sku,
                    price_selling,
                    color,
                    price_ticket: increseTax,
                    price_card: descreaseTw,
                    price_cash: descreaseThird,
                    price_link: decreaseFifteen,
                    category: "Service",
                    status,
                    workLoad, course, modality, duration
                },
            });

            return res.status(201).json(newInsume);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create Insume' });
        }
    }

    async update(req, res) {
        const { id } = req.params;
        const { name, sku, price_selling, color } = req.body;

        const { decreaseFifteen, descreaseThird, descreaseTw, increseTax } = await AplieDescount(price_selling)


        try {
            const updatedInsume = await prisma.services.update({
                where: { id: id },
                data: {
                    name,
                    sku,
                    price_selling,
                    price_ticket: increseTax,
                    price_card: descreaseTw,
                    price_cash: descreaseThird,
                    price_link: decreaseFifteen,
                    color,
                },
            });
            return res.status(200).json(updatedInsume);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update Insume' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        try {
            await prisma.services.delete({
                where: { id },
            });
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete Insume' });
        }
    }
}

export default new ServicesController();
