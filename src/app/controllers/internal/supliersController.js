
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
        const { take, skip, orderBy, orderFor, query } = req.body

        console.log(take)
        try {
            const withQuery = async () => {
                const [supliers, total] = await prisma.$transaction([
                    prisma.supliers.findMany({
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
                return { supliers, total }
            }
            const withoutQuery = async () => {
                const [supliers, count] = await prisma.$transaction([
                    prisma.supliers.findMany({
                        take: parseInt(take),
                        skip: parseInt(skip),
                        orderBy: {
                            [orderBy]: orderFor
                        }
                    }),
                    prisma.supliers.count()

                ])
                return { supliers, count }
            }



            const { supliers, count } = query ? await withQuery() :
                await withoutQuery()

            return res.status(200).json({
                supliers,
                total: count
            });

        } catch (error) {
            console.log({ error })
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
                Rua: yup.string().transform(nonNullable),
                Bairro: yup.string().transform(nonNullable),
                Cidade: yup.string().transform(nonNullable),
                UF: yup.string().transform(nonNullable),
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

            const { comercialPhone, descricao,
                email, telefone, whatsapp, orderEmail } = contacts;

            const { complemento, numero,
                Rua, Bairro, Cidade, UF, cep } = address;

            const newsuplier = await prisma.supliers.create({
                data: {
                    name,
                    docment,
                    type,
                    contacts: {
                        comercialPhone,
                        descricao,
                        email, telefone, whatsapp, orderEmail
                    },
                    address: {
                        complemento, numero,
                        Rua, Bairro, Cidade, UF, cep
                    }

                },
            });

            return res.status(201).json(newsuplier);
        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: error.errors });
        }
    }

    async update(req, res) {

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

            }),

            address: yup.object().shape({
                numero: yup.string().transform(nonNullable),
                cep: yup.string().transform(nonNullable),
                Rua: yup.string().transform(nonNullable),
                Bairro: yup.string().transform(nonNullable),
                Cidade: yup.string().transform(nonNullable),
                UF: yup.string().transform(nonNullable),
                complemento: yup.string(),
            })


        })

        const { id } = req.params;

        try {

            await schema.validateSync(req.body, { abortEarly: false })

            const { name, type, document, numero,
                ['telefone comercial']: comercialPhone,
                ['email para pedido']: orderEmail,
                descricao, complemento, email, telefone, whatsapp, Rua,
                Bairro, Cidade, UF, cep
            } = req.body;

            const updatedsuplier = await prisma.supliers.update({
                where: { id: id },
                data: {
                    name,
                    docment: document,
                    type,
                    contacts: {
                        comercialPhone,
                        descricao,
                        email, telefone, whatsapp, orderEmail
                    },
                    address: {
                        complemento, numero,
                        Rua, Bairro, Cidade, UF, cep
                    }

                },
            })



            return res.status(200).json(updatedsuplier);
        } catch (error) {
            console.log("error")
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

            return res.status(500).json({ error: 'Failed to delete suplier' });
        }
    }
}

export default new SupliersControllers();

