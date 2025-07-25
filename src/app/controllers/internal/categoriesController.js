import * as yup from 'yup';
import prisma from '../../../database/database.js';

class CategorieProductController {

    async indexFilter(req, res) {
        try {

            const [categorie, count] = await prisma.$transaction([
                prisma.productCategories.findMany({

                    orderBy: {
                        name: "asc"
                    }
                }),
                prisma.productCategories.count()

            ])


            return res.status(200).json({
                categorie,
                total: count
            });

        } catch (error) {
            console.log({ where: "[GET.ALLFILTERS]", error })
            return res.status(500).json({ error: 'Failed to fetch categorie' });
        }
    }

    async index(req, res) {
        const { take, skip, orderBy, query, orderFor } = req.body;

        try {

            const [categorie, total] = await prisma.$transaction([
                prisma.productCategories.findMany({
                    take: parseInt(take),
                    skip: parseInt(skip),
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    include: {
                        products: {
                            select: {
                                name: true,
                                id: true,
                                priceSale: true
                            }
                        }
                    }
                }),
                prisma.productCategories.count()

            ])


            return res.status(200).json({
                categorie,
                total
            });

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ error: 'Failed to fetch categorie' });
        }
    }

    async store(req, res) {
        const schema = yup.object().shape({
            name: yup.string().required(),
            products: yup.array(),
        })
        try {
            await schema.validateSync(req.body, { abortEarly: false })


            const { name, products } = req.body;

            const body = {
                name,
            }

            if (products.length > 0) {
                body['products'] = {
                    connect: products
                }
            }

            const newCategorie = await prisma.productCategories.create({
                data: body
            })

            return res.status(201).json(newCategorie);
        } catch (error) {
            console.log({
                where: "[CREATE.CATEGORIE]",
                error
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })
            return res.status(500).json({ error: 'Failed to create Insume' });
        }
    }

    async update(req, res) {
        const schema = yup.object().shape({
            name: yup.string().required(),
            products: yup.array().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })


            const { id } = req.params;
            const { name, products } = req.body;

            const body = {
                name,
                products
            }

            if (products.length > 0) {
                body['products'] = {
                    connect: products
                }
            }

            const categorieUpdated = await prisma.productCategories.update({
                where: {
                    id
                },
                data: body
            });


            return res.status(200).json(categorieUpdated);
        } catch (error) {
            console.log({
                where: "[UPDATE.CATEGORIEPRODUCTS]",
                error
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })
            return res.status(500).json({ error: 'Falha para editar sua categoria, verifique seus dados' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        try {

            await prisma.productCategories.delete({
                where: { id },
            });

            return res.status(200).json({ message: 'Deletado com sucesso' });
        } catch (error) {

            return res.status(500).json({ error: 'Erro ao deletar categoria' });
        }
    }
}

export default new CategorieProductController();

