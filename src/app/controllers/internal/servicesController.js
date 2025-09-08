import * as yup from 'yup';
import prisma from '../../../database/database.js';
import { CreateServices, DeleteService } from '../../connection/externalConnections/contaAzulStrategy.js';
import { CreateServicesAtRD, EditServicesAtRD, ReturnServiceAtRD } from '../../connection/externalConnections/rdStation.js';
class ServicesController {

    async indexFilter(req, res) {
        try {


            const [services, count] = await prisma.$transaction([
                prisma.service.findMany({
                    orderBy: {
                        name: "asc"
                    },
                    omit: {
                        // tenantId: true,
                        created_at: true,
                        updated_at: true,
                        category: true,
                    }
                }),
                prisma.service.count()

            ])


            return res.status(200).json({
                services,
                total: count
            });

        } catch (error) {
            console.log({ error })
            return res.status(500).json({ message: 'Failed to fetch services' });
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



            const [services, total] = await prisma.$transaction([
                prisma.service.findMany({
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
                prisma.service.count({
                    where: {
                        AND: [...filters]
                    }
                })

            ])


            return res.status(200).json({
                services,
                total
            });



        } catch (error) {
            console.log({
                error,
                where: "[GET INDEX SERVICES]"
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ message: 'Failed to fetch Insumes' });
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
            console.log({ query })
            const [services, total] = await prisma.$transaction([
                prisma.service.findMany({
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
                prisma.service.count({
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
                services,
                total
            });

        } catch (error) {

            console.log({
                error,
                where: "[GET QUERY services]"
            })
            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ error: 'Failed to fetch services' });
        }
    }

    async store(req, res) {

        const schema = yup.object().shape({
            name: yup.string().required(),
            code: yup.string().required(),
            description: yup.string().required(),
            priceSale: yup.string().required(),
            priceCost: yup.string().required(),
            modality: yup.string().required(),
            workLoad: yup.string().required(),

            duration: yup.number().required(),
            active: yup.bool(),
        })


        try {

            await schema.validateSync(req.body, { abortEarly: false });

            const { name, code, active, workLoad, description, priceSale,
                priceCost, modality, duration } = req.body;

            const duplicate = await prisma.service.findFirst({
                where: {
                    OR: [
                        {
                            name: {
                                equals: name
                            }
                        },
                        {
                            code: {
                                equals: code
                            }
                        },
                    ]
                }
            })

            if (duplicate) return res.status(401).json({ message: "Já existe um produto com este nome/código" })

            const promise = await Promise.allSettled([
                CreateServicesAtRD(req.body),
                CreateServices({
                    unity: ["Centro", "PTB"],
                    body: req.body
                })
            ])

            const rejected = promise.find(pr => pr.status === "rejected")

            if (rejected) return res.status(401).json({ message: rejected.reason.error })

            const newInsume = await prisma.service.create({
                data: {
                    name,
                    code, active, workLoad,
                    description, priceSale,
                    priceCost, modality, duration: parseInt(duration),
                    category: "Service"
                }
            });

            return res.status(201).json(newInsume);


        } catch (error) {

            console.error({
                error,
                where: "[CREATE SERVICES]"
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ message: 'Falha ao criar um novo serviço, verifique seus dados' });
        }
    }

    async update(req, res) {

        const schema = yup.object().shape({
            name: yup.string().required(),
            code: yup.string().required(),
            workLoad: yup.string().required(),
            description: yup.string().required(),
            priceSale: yup.string().required(),
            priceCost: yup.string().required(),
            modality: yup.string().required(),

            active: yup.bool().required(),
            duration: yup.number().required(),

        })

        try {
            await schema.validateSync(req.body, { abortEarly: false });

            const { id } = req.params;

            const { name, code, active, workLoad, description,
                priceSale, priceCost, modality, duration } = req.body;

            const { name: fName } = await prisma.service.findUnique({
                where: {
                    id
                }
            });


            const serviceAtRd = await ReturnServiceAtRD(fName)

            const editBody = {
                name,
                visible: active,
                description: `
sku: ${code},
carga horária: ${workLoad},
modalidade: ${modality},
duração: ${duration},
curso: ${name}
`,
            }

            await EditServicesAtRD({ service: editBody, service: serviceAtRd })


            const updatedInsume = await prisma.service.update({
                where: { id: id },
                data: {
                    name, code, active,
                    workLoad, description, priceSale,
                    priceCost, modality, duration,
                },
            });

            return res.status(200).json(updatedInsume);

        } catch (error) {

            console.error({
                error,
                where: "[EDIT SERVICES]"
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ message: 'Failed to update Insume' });
        }
    }

    async delete(req, res) {
        const { id } = req.params;

        try {
            const { name } = await prisma.service.findUnique({ where: { id } });
            const serviceAtRd = await ReturnServiceAtRD(name);

            const promise = await Promise.allSettled([
                EditServicesAtRD({ service: serviceAtRd, service: { visible: false, } }),
                DeleteService({ name: name, unity: ["Centro, PTB"] })
            ])

            const rejected = promise.find(pr => pr.status === "rejected")

            if (rejected) return res.status(401).json({ message: rejected.reason.error })

            await prisma.service.delete({ where: { id } });

            return res.status(204).send();

        } catch (error) {
            console.log({
                error,
                where: "[DELETE SERVICES]"
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(500).json({ message: 'Failed to fetch Insumes' });
        }
    }
}

export default new ServicesController();
