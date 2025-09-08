import * as yup from 'yup';
import prisma from '../../../database/database.js';
import { AplieDescount } from '../../../utils/functions/descountAplied.js';
import { getOptionsFromRdCustomFields, updateRdOptionsCustomFields } from '../../connection/externalConnections/rdStation.js';

class KitsController {

    async indexFilter(req, res) {
        try {


            const [kits, count] = await prisma.$transaction([
                prisma.kit.findMany({

                    orderBy: {
                        name: "asc"
                    }
                }),
                prisma.kit.count()

            ])


            return res.status(200).json({
                kits,
                total: count
            });

        } catch (error) {
            console.log({ error, where: "[INDEX GET ALL]" })
            return res.status(500).json({ error: 'Failed to fetch kits' });
        }
    }

    async index(req, res) {
        const { take, skip, orderBy, query, orderFor } = req.body;

        try {
            const withQuery = async () => {
                const [kits, count] = await prisma.$transaction([
                    prisma.kit.findMany({
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
                        },
                        include: {
                            relatedProducts: {
                                select: {
                                    id: true,
                                    name: true,
                                    priceSale: true
                                }
                            }
                        }
                    }),
                    prisma.kit.count({
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
                return { kits, count }
            };

            const withoutQuery = async () => {
                const [kits, count] = await prisma.$transaction([
                    prisma.kit.findMany({
                        take: parseInt(take),
                        skip: parseInt(skip),
                        orderBy: {
                            [orderBy]: orderFor
                        },
                        include: {
                            relatedProducts: {
                                select: {
                                    id: true,
                                    name: true,
                                    priceSale: true
                                }
                            }
                        }
                    }),
                    prisma.kit.count()

                ])
                return { kits, count }
            }



            const { kits, count } = query ? await withQuery() :
                await withoutQuery()

            return res.status(200).json({
                kits,
                total: count
            });

        } catch (error) {
            console.log({ error, where: "[KITS INDEX]" })
            return res.status(500).json({ error: 'Failed to fetch kits' });
        }
    }

    async store(req, res) {
        const schema = yup.object().shape({
            name: yup.string().required("Nome do kit é um campo obrigatório \n"),
            code: yup.string().required("Código do kit é um campo obrigatório \n"),
            description: yup.string().nullable(),
            priceSale: yup.number().required("Preço de venda é um campo obrigatório \n"),
            relatedProducts: yup.array().required(),
        })
        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { name, code, priceSale, description, relatedProducts } = req.body;

            const body = {
                name, code, priceSale, description,
            }

            if (relatedProducts.length > 0) {
                body['relatedProducts'] = {
                    connect: relatedProducts
                }
            }


            const newKit = await prisma.kit.create({
                data: body,
            })

            if (1 > 2) {
                const opts = await getOptionsFromRdCustomFields("64bee4fa5ccd17001cec1e12")
                let newMd = name.concat(` / ${sku}`)
                let filteredOptions = opts.filter(res => !res.includes(name))

                await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions.concat(newMd))


                const { decreaseFifteen, descreaseThird, descreaseTw, increseTax } = await AplieDescount(price_selling)

                const newInsume = await prisma.kit.create({
                    data: {
                        name,
                        sku,
                        price_selling,
                        color,
                        price_ticket: increseTax,
                        price_card: descreaseTw,
                        price_cash: descreaseThird,
                        price_link: decreaseFifteen,
                        category: "Product"
                    },
                });

            }

            return res.status(201).json(newKit);
        } catch (error) {
            console.log({
                where: "[CREATE.KIT]",
                error
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })
            return res.status(500).json({ message: 'Falha ao criar kit, verifique os dados enviados' });
        }
    }

    async update(req, res) {
        const { id } = req.params;
        const schema = yup.object().shape({
            name: yup.string().required(),
            code: yup.string().required(),
            description: yup.string().nullable(),
            priceSale: yup.number().required(),
            relatedProducts: yup.array().required(),
        })
        try {
            await schema.validateSync(req.body, { abortEarly: false })


            const { name, code, priceSale, description, relatedProducts } = req.body;

            const body = {
                name, code, priceSale, description,
            }

            if (relatedProducts.length > 0) {
                body['relatedProducts'] = {
                    connect: relatedProducts
                }
            }


            const kitUpdated = await prisma.kit.update({
                where: {
                    id
                },
                data: body,

            })

            if (1 > 2) {
                const { name: fName, status: fStatus } = await prisma.kit.findUnique({
                    where: {
                        id
                    }
                });


                if (name !== fName || status !== fStatus) {
                    try {
                        const opts = await getOptionsFromRdCustomFields("64bee4fa5ccd17001cec1e12")
                        let newMd = name.concat(` / ${sku}`)
                        let filteredOptions = opts.filter(res => !res.includes(fName))

                        status === false ? await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions) :
                            await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions.concat(newMd))


                    } catch (error) {
                        console.log(error)
                        return res.status(500).json({ error: 'Failed to update Insume' });

                    }

                }

                const { decreaseFifteen, descreaseThird, descreaseTw, increseTax } = await AplieDescount(price_selling)

                const updatedInsume = await prisma.kit.update({
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
                        status
                    },
                })
            }


            return res.status(200).json(kitUpdated);
        } catch (error) {
            console.log({
                where: "[UPDATE.KIT]",
                error
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })
            return res.status(500).json({ message: 'Failed to update Insume' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        const { name: fName } = await prisma.kit.findUnique({
            where: {
                id
            }
        });

        try {
            const opts = await getOptionsFromRdCustomFields("64bee4fa5ccd17001cec1e12")

            let filteredOptions = opts.filter(res => !res.includes(fName))

            await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions)



            await prisma.kit.delete({
                where: { id },
            });
            return res.status(200).json({ message: 'Insume deleted successfully' });
        } catch (error) {

            return res.status(500).json({ error: 'Failed to delete Insume' });
        }
    }
}

export default new KitsController();

