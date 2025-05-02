import { AplieDescount } from '../../../config/descountAplied.js';
import prisma from '../../../database/database.js';
import { CreateServicesAtRD, EditServicesAtRD, ReturnServiceAtRD } from '../../connection/externalConnections/rdStation.js';
class ServicesController {

    async indexFilter(req, res) {
        try {


            const [services, count] = await prisma.$transaction([
                prisma.services.findMany({

                    orderBy: {
                        name: "asc"
                    }
                }),
                prisma.services.count()

            ])


            return res.status(200).json({
                services,
                total: count
            });

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ error: 'Failed to fetch services' });
        }
    }

    async index(req, res) {

        const { take, skip, orderBy, query, orderFor } = req.body

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
                            [orderBy]: orderFor
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
                            [orderBy]: orderFor
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

            await CreateServicesAtRD({
                "name": name,
                "description": `
sku: ${sku},
carga horária: ${workLoad},
modalidade: ${modality},
duração: ${duration},
curso: ${course}
`,
                "base_price": increseTax * parseInt(duration),
            })


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
        const { name, sku, price_selling, color, status,
            workLoad, course, modality, duration
        } = req.body;

        const { decreaseFifteen, descreaseThird, descreaseTw, increseTax } = await AplieDescount(price_selling)


        try {

            const { name: fName, status: fStatus } = await prisma.services.findUnique({
                where: {
                    id
                }
            });


            if (name !== fName || status !== fStatus) {
                try {
                    const { id } = await ReturnServiceAtRD(fName)

                    if (!id) res.status(500).json({ error: 'Failed to update Insume' });

                    const editBody = {
                        name,
                        visible: status,
                        description: `
sku: ${sku},
carga horária: ${workLoad},
modalidade: ${modality},
duração: ${duration},
curso: ${course}
`,
                    }


                    await EditServicesAtRD(id, editBody)

                } catch (error) {
                    console.log(error)
                    return res.status(500).json({ error: 'Failed to update Insume' });

                }

            }



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
                    status,
                    workLoad, course, modality, duration

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
            const { id } = await ReturnServiceAtRD(fName)


            await EditServicesAtRD(id, {
                visible: false,

            })

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
