
import * as yup from 'yup';
import prisma from '../../../database/database.js';


class SupliersControllers {

    async indexFilter(req, res) {

        try {

            const [supliers, count] = await prisma.$transaction([
                prisma.supliers.findMany({
                    orderBy: {
                        name: 'asc'
                    }
                }),
                prisma.supliers.count()

            ])


            return res.status(200).json({
                supliers,
                total: count
            });

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ error: 'Failed to fetch supliers' });
        }
    }

    async index(req, res) {
        const schema = yup.object().shape({

            take: yup.string().required(),
            skip: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
            typeFilter: yup.array().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { take, skip, orderBy, orderFor } = req.body



            const [supliers, total] = await prisma.$transaction([
                prisma.supliers.findMany({
                    take: parseInt(take),
                    skip: parseInt(skip),
                    orderBy: {
                        [orderBy]: orderFor
                    }
                }),
                prisma.supliers.count()

            ])




            return res.status(200).json({
                supliers,
                total
            });

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ error: 'Failed to fetch supliers' });
        }
    }
    async query(req, res) {
        const schema = yup.object().shape({

            take: yup.string().required(),
            skip: yup.string().required(),
            query: yup.string().required(),

            orderFor: yup.string().required(),
            orderBy: yup.string().required(),
            typeFilter: yup.array().required(),

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { take, skip, orderBy, orderFor, query } = req.body

            const [supliers, total] = await prisma.$transaction([
                prisma.supliers.findMany({
                    take: parseInt(take),
                    skip: parseInt(skip),
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    where: {
                        OR: [
                            {
                                name: {
                                    contains: query,
                                    mode: "insensitive"
                                }
                            },
                            {
                                docment: {
                                    contains: query,
                                    mode: "insensitive"
                                }
                            }
                        ]
                    },

                }),
                prisma.supliers.count({
                    where: {
                        OR: [
                            {
                                name: {
                                    contains: query,
                                    mode: "insensitive"
                                }
                            },
                            {
                                docment: {
                                    contains: query,
                                    mode: "insensitive"
                                }
                            }
                        ]
                    },
                })

            ])



            return res.status(200).json({
                supliers,
                total
            });

        } catch (error) {
            console.log({
                where: "[SUPLIER.QUERY]",
                error
            })
            return res.status(500).json({ error: 'Failed to fetch supliers' });
        }
    }

    async store(req, res) {
        const nonNullable = (value) => {
            return value ? value : ''

        }

        const schema = yup.object().shape({
            type: yup.string().required("Tipo de fornecedor é obrigatório"),
            name: yup.string().required("O campo nome é obrigatório"),
            docment: yup.string().required("O campo documento é obrigatório"),

            contacts: yup.object().shape({
                descricao: yup.string(),
                email: yup.string().transform(nonNullable),
                telefone: yup.string().transform(nonNullable),
                comercialPhone: yup.string().transform(nonNullable),
                whatsapp: yup.string().transform(nonNullable),
                orderEmail: yup.string().transform(nonNullable),
            }).required(),
            address: yup.object().shape({
                numero: yup.string().transform(nonNullable),
                cep: yup.string().transform(nonNullable),
                rua: yup.string().transform(nonNullable),
                bairro: yup.string().transform(nonNullable),
                cidade: yup.string().transform(nonNullable),
                uf: yup.string().transform(nonNullable),
                complemento: yup.string(),
            }).required()
        })

        try {

            await schema.validateSync(req.body, { abortEarly: false })

            const { name, type, docment, contacts, address } = req.body;


            const isThere = await prisma.supliers.findUnique({
                where: {
                    docment
                }
            })

            if (isThere) return res.status(400).json({ message: "Já existe um fornecedor com esse Documento cadastrado" })

            const newsuplier = await prisma.supliers.create({
                data: {
                    name,
                    docment,
                    type,
                    contacts,
                    address

                },
            });

            return res.status(201).json(newsuplier);
        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: error.errors });
        }
    }

    async update(req, res) {


        const schema = yup.object().shape({
            type: yup.string().required("Tipo de fornecedor é obrigatório"),
            name: yup.string().required("O campo nome é obrigatório"),
            docment: yup.string().required("O campo documento é obrigatório"),

            contacts: yup.object().shape({
                descricao: yup.string(),
                email: yup.string(),
                telefone: yup.string(),

                comercialPhone: yup.string(),
                whatsapp: yup.string(),
                orderEmail: yup.string(),

            }),

            address: yup.object().shape({
                numero: yup.string(),
                cep: yup.string(),
                rua: yup.string(),
                bairro: yup.string(),
                cidade: yup.string(),
                uf: yup.string(),
                complemento: yup.string(),
            })

        })

        const schemaParam = yup.object().shape({
            id: yup.string().required("Tipo de fornecedor é obrigatório"),
        })

        try {

            await schema.validateSync(req.body, { abortEarly: false })
            await schemaParam.validateSync(req.params, { abortEarly: false })

            const { id } = req.params;
            const { name, type, docment, contacts, address } = req.body;




            const updatedsuplier = await prisma.supliers.update({
                where: { id: id },
                data: {
                    name,
                    docment,
                    type,
                    contacts,
                    address
                },
            })



            return res.status(200).json(updatedsuplier);
        } catch (error) {
            console.log({
                where: "[EDIT.SUPLIER]",
                error
            })
            return res.status(500).json({ message: error.errors });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        try {

            await prisma.supliers.delete({
                where: { id },
            });

            return res.status(200).json({ message: 'suplier deleted successfully' });
        } catch (error) {

            if (error.meta.field_name === 'requests_suplierID_fkey (index)') return res.status(500).json({ message: 'Não é permitido apagar um vendedor que possui vendas associadas a ele!' });
            console.log(error)
            return res.status(500).json({ message: error });
        }
    }
}

export default new SupliersControllers();

