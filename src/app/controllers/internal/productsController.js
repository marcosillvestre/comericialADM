import * as yup from 'yup';
import prisma from '../../../database/database.js';
import { CreateProducts } from '../../connection/externalConnections/contaAzulStrategy.js';
import { getOptionsFromRdCustomFields, UpdateCustomFields, updateRdOptionsCustomFields } from '../../connection/externalConnections/rdStation.js';

class ProductsController {

    async indexFilter(req, res) {
        try {
            const [products, count] = await prisma.$transaction([
                prisma.product.findMany({
                    where: {
                        active: {
                            equals: true
                        }
                    },
                    orderBy: {
                        name: "asc"
                    },
                    omit: {
                        // tenantId: true,
                        created_at: true,
                        updated_at: true,
                        priceCost: true,
                        ean: true,
                        unit: true,
                        minStock: true,
                        maxStock: true,
                    }
                }),
                prisma.product.count({
                    where: {
                        active: {
                            equals: true
                        }
                    },
                })

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
        const schema = yup.object().shape({

            skip: yup.string().required(),
            take: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),

            typeFilter: yup.array().required(),

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false });

            const { take, skip, orderBy, typeFilter, orderFor, } = req.body;


            const filters = typeFilter.map(res => {
                const bools = {
                    "Sim": true,
                    "Não": false
                }


                if (res.label.includes("DATA")) {
                    const [initialValue, finalValue] = res.value.split("~")

                    return {
                        [res.key]: {
                            gte: HandleUTCDate(initialValue),
                            lte: HandleUTCDate(finalValue)
                        }
                    }
                }

                return {
                    [res.key]: {
                        equals: bools[res.value] ?? res.value

                    }
                }
            })



            const [products, total] = await prisma.$transaction([
                prisma.product.findMany({
                    take: parseInt(take),
                    skip: parseInt(skip),
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    where: {
                        AND: [
                            ...filters
                        ]
                    }
                }),
                prisma.product.count({
                    where: {
                        AND: [...filters]
                    }
                })

            ])


            return res.status(200).json({
                products,
                total
            });

        } catch (error) {
            console.log({
                error,
                where: "[GET INDEX PRODUCTS]"
            })
            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ error: 'Failed to fetch Products' });
        }
    }

    async query(req, res) {
        const schema = yup.object().shape({

            skip: yup.string().required(),
            take: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
            query: yup.string().required(),

            typeFilter: yup.array().required(),

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false });

            const { take, skip, orderBy, typeFilter, orderFor, query } = req.body;


            const filters = typeFilter.map(res => {
                const bools = {
                    "Sim": true,
                    "Não": false
                }


                if (res.label.includes("DATA")) {
                    const [initialValue, finalValue] = res.value.split("~")

                    return {
                        [res.key]: {
                            gte: HandleUTCDate(initialValue),
                            lte: HandleUTCDate(finalValue)
                        }
                    }
                }

                return {
                    [res.key]: {
                        equals: bools[res.value] ?? res.value

                    }
                }
            })

            const [products, total] = await prisma.$transaction([
                prisma.product.findMany({
                    where: {
                        AND: [
                            ...filters,
                            {
                                OR: [
                                    {
                                        name: {
                                            contains: query,
                                            mode: "insensitive"
                                        }
                                    },
                                    {
                                        code: {
                                            contains: query,
                                            mode: "insensitive"
                                        }
                                    }
                                ]
                            }
                        ],
                    },
                    take: parseInt(take),
                    skip: parseInt(skip),
                    orderBy: {
                        [orderBy]: orderFor
                    }
                }),
                prisma.product.count({
                    where: {
                        AND: [
                            ...filters,
                            {
                                OR: [
                                    {
                                        name: {
                                            contains: query,
                                            mode: "insensitive"
                                        }
                                    },
                                    {
                                        code: {
                                            contains: query,
                                            mode: "insensitive"
                                        }
                                    }
                                ]
                            }
                        ],
                    },
                })

            ])


            return res.status(200).json({
                products,
                total
            });

        } catch (error) {

            console.log({
                error,
                where: "[GET QUERY PRODUCTS]"
            })
            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ error: 'Failed to fetch Products' });
        }
    }



    async store(req, res) {
        const schema = yup.object().shape({
            name: yup.string().required(),
            code: yup.string().required(),
            unit: yup.string().required(),
            priceSale: yup.number().nullable(),
            priceCost: yup.number().nullable(),
            minStock: yup.number().nullable(),
            maxStock: yup.number().nullable(),

            ean: yup.string().nullable(),
            description: yup.string().nullable(),
            active: yup.bool().nullable(),
            categorieName: yup.string().nullable(),

        })

        const { name, code, priceSale, priceCost, ean, unit,
            description, minStock, maxStock, active, categorieName,
        } = req.body;

        if (minStock >= maxStock) return res.status(500).json({ message: 'Estoque máximo deve ser maior que o mínimo' });

        try {
            await schema.validateSync(req.body, { abortEarly: false });


            const body = {
                name,
                code,
                priceSale, priceCost, ean, unit,
                description, minStock, maxStock, active,

            }

            if (categorieName) {
                body["categorie"] = {
                    connect: {
                        name: categorieName
                    }
                }
            }


            const promise = await Promise.allSettled([
                UpdateCustomFields({ value: name, sku: code, id: '64bee4fa5ccd17001cec1e12' }),
                CreateProducts({ unity: ["PTB", "Centro"], body: req.body })
            ])

            const rejected = promise.find(pr => pr.status === "rejected")

            if (rejected) return res.status(401).json({ message: rejected.reason.error })

            const newProduct = await prisma.product.create({
                data: body
            })

            return res.status(201).json(newProduct);


        } catch (error) {

            console.log({
                error,
                where: "[CREATE.PRODUCT]",
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ message: 'Falha para criar um novo produto, verifique os dados' });
        }
    }

    async update(req, res) {
        const { id } = req.params;
        const schema = yup.object().shape({
            name: yup.string().required(),
            code: yup.string().required(),
            unit: yup.string().required(),
            priceSale: yup.number().nullable(),
            priceCost: yup.number().nullable(),
            minStock: yup.number().nullable(),
            maxStock: yup.number().nullable(),

            ean: yup.string().nullable(),
            description: yup.string().nullable(),
            active: yup.bool().nullable(),
            categorieName: yup.string().nullable(),

        })

        const { name, code, priceSale, priceCost, ean, unit,
            description, minStock, maxStock, active, categorieName,
        } = req.body;

        if (minStock > maxStock) return res.status(500).json({ message: 'Estoque máximo deve ser maior que o mínimo' });

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const body = {
                name,
                code,
                priceSale, priceCost, ean, unit,
                description, minStock, maxStock, active,
            }

            if (categorieName) {
                body['categorie'] = {
                    connect: {
                        name: categorieName
                    }
                }
            }

            const { name: fName, } = await prisma.product.findUnique({
                where: {
                    id
                }
            });


            if (name !== fName) {
                const opts = await getOptionsFromRdCustomFields("64bee4fa5ccd17001cec1e12")
                let newMd = name.concat(` / ${sku}`)
                let filteredOptions = opts.filter(res => !res.includes(fName))

                await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions.concat(newMd))

            }


            const updatedProduct = await prisma.product.update({
                where: {
                    id
                },
                data: body
            })


            return res.status(200).json(updatedProduct);
        } catch (error) {
            console.log({ where: "[UPDATE.PRODUCT]", error })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ message: 'Failed to update Insume' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        const { name: fName } = await prisma.product.findUnique({
            where: {
                id
            }
        });

        try {
            const opts = await getOptionsFromRdCustomFields("64bee4fa5ccd17001cec1e12")

            let filteredOptions = opts.filter(res => !res.includes(fName))

            await updateRdOptionsCustomFields("64bee4fa5ccd17001cec1e12", filteredOptions)



            await prisma.product.delete({
                where: { id },
            });
            return res.status(200).json({ message: 'Insume deleted successfully' });
        } catch (error) {

            return res.status(500).json({ error: 'Failed to delete Insume' });
        }
    }
}

export default new ProductsController();

