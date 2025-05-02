import { AplieDescount } from '../../../config/descountAplied.js';
import prisma from '../../../database/database.js';
import { getOptionsFromRdCustomFields, updateRdOptionsCustomFields } from '../../connection/externalConnections/rdStation.js';
class ProductsController {

    async indexFilter(req, res) {
        try {


            const [products, count] = await prisma.$transaction([
                prisma.products.findMany({

                    orderBy: {
                        name: "asc"
                    }
                }),
                prisma.products.count()

            ])


            return res.status(200).json({
                products,
                total: count
            });

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ error: 'Failed to fetch Products' });
        }
    }

    async index(req, res) {
        const { take, skip, orderBy, query, orderFor } = req.body;

        try {
            const withQuery = async () => {
                const [products, count] = await prisma.$transaction([
                    prisma.products.findMany({
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
                    prisma.products.count({
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
                return { products, count }
            };

            const withoutQuery = async () => {
                const [products, count] = await prisma.$transaction([
                    prisma.products.findMany({
                        take: parseInt(take),
                        skip: parseInt(skip),
                        orderBy: {
                            [orderBy]: orderFor
                        }
                    }),
                    prisma.products.count()

                ])
                return { products, count }
            }



            const { products, count } = query ? await withQuery() :
                await withoutQuery()

            return res.status(200).json({
                products,
                total: count
            });

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ error: 'Failed to fetch Products' });
        }
    }

    async store(req, res) {
        const { name, sku, price_selling, color } = req.body;

        try {

            const opts = await getOptionsFromRdCustomFields("64bee4fa5ccd17001cec1e12")
            let newMd = name.concat(` / ${sku}`)
            let filteredOptions = opts.filter(res => !res.includes(name))

            await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions.concat(newMd))


            const { decreaseFifteen, descreaseThird, descreaseTw, increseTax } = await AplieDescount(price_selling)

            const newInsume = await prisma.products.create({
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

            return res.status(201).json(newInsume);
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: 'Failed to create Insume' });
        }
    }

    async update(req, res) {
        const { id } = req.params;
        const { name, sku, price_selling, color, status } = req.body;


        try {
            const { name: fName, status: fStatus } = await prisma.products.findUnique({
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

            const updatedInsume = await prisma.products.update({
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



            return res.status(200).json(updatedInsume);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update Insume' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        const { name: fName } = await prisma.products.findUnique({
            where: {
                id
            }
        });

        try {
            const opts = await getOptionsFromRdCustomFields("64bee4fa5ccd17001cec1e12")

            let filteredOptions = opts.filter(res => !res.includes(fName))

            await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions)



            await prisma.products.delete({
                where: { id },
            });
            return res.status(200).json({ message: 'Insume deleted successfully' });
        } catch (error) {

            return res.status(500).json({ error: 'Failed to delete Insume' });
        }
    }
}

export default new ProductsController();

