import axios from 'axios'
import 'dotenv'
import * as yup from 'yup'
import prisma from '../../../database/database.js'
import { getOptionsFromRdCustomFields, updateRdOptionsCustomFields } from '../../connection/externalConnections/rdStation.js'

class CampaignController {

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

            const { take, skip, orderBy, orderFor, typeFilter } = req.body;


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

            const [campaigns, total] = await prisma.$transaction([

                prisma.campaign.findMany({
                    orderBy: {
                        [orderBy]: orderFor
                    },
                    take: parseInt(take),
                    skip: parseInt(skip),
                    where: {
                        AND: [
                            ...filters
                        ]
                    }
                }),
                prisma.campaign.count({
                    where: {
                        AND: [
                            ...filters
                        ]
                    }
                })
            ])


            return res.status(200).json({ campaigns, total });

        } catch (error) {
            console.log({
                error,
                where: '[CAMPAIGN.GET]',
            })
            return res.status(401).json(error)

        }
    }
    async store(req, res) {

        const schema = yup.object().shape({
            name: yup.string().required(),
            description: yup.string().required(),
            descountType: yup.string().required(),
            affectedParcels: yup.number().required(),
            destiny: yup.string().required(),
            value: yup.number().required(),
            status: yup.bool().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { name, affectedParcels, descountType, description, value, destiny, status } = req.body

            const storeCampaign = async (name, affectedParcels, descountType, description, value, destiny) => {

                await prisma.campaign.create({
                    data: {
                        name,
                        affectedParcels,
                        descountType,
                        description,
                        value,
                        for: destiny,
                        status

                    }
                })
            }



            await axios.get(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.CAMPAIGN_ID}?token=${process.env.RD_TOKEN}`)
                .then(async res => {

                    const options = res.data.opts

                    const response = await axios.put(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.CAMPAIGN_ID}?token=${process.env.RD_TOKEN}`, {
                        opts: options.concat(name)
                    })

                    if (response) storeCampaign(name, affectedParcels, descountType, description, value, destiny)

                })


            return res.status(201).json("Criado com sucesso")

        } catch (error) {
            console.log({
                where: '[CAMPAIGN.CREATE]',
                error
            })
            return res.status(401).json(error)
        }


    }


    async update(req, res) {
        const { id } = req.params

        const {
            name, description, affectedParcels, value, descountType,
            for: destiny, status
        } = req.body

        const schema = yup.object().shape({
            name: yup.string().required(),
            description: yup.string().required(),
            affectedParcels: yup.number().required(),
            value: yup.number().required(),
            descountType: yup.string().required(),
            for: yup.string().required(),
            status: yup.bool().required(),
        })



        const { name: storedName, status: storedStatus } = await prisma.campaign.findFirst({
            where: {
                id: id
            }
        })



        if (storedName !== name || storedStatus !== status) {

            const options = await getOptionsFromRdCustomFields(process.env.CAMPAIGN_ID)
            const newOptions = options.filter(r => r !== name)
            await updateRdOptionsCustomFields(process.env.CAMPAIGN_ID, status === false ? newOptions : options.concat(name))
        }



        try {
            await schema.validateSync(req.body, { abortEarly: false })

            await prisma.campaign.update({
                where: {
                    id
                },
                data: {
                    name,
                    description,
                    affectedParcels,
                    value,
                    descountType,
                    for: destiny,
                    status
                }
            })


            return res.status(200).json("Editado com successo")

        } catch (error) {
            console.log({
                where: '[CAMPAIGN.UPDATE]',
                error
            })
            return res.status(401).json(error)
        }
    }
    async delete(req, res) {
        const { id } = req.params


        const campaignDeleted = await prisma.campaign.delete({
            where: {
                id
            }
        })

        if (campaignDeleted) {

            const { name } = campaignDeleted

            try {
                await axios.get(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.CAMPAIGN_ID}?token=${process.env.RD_TOKEN}`)
                    .then(async res => {

                        const options = res.data.opts

                        const response = await axios.put(`https://crm.rdstation.com/api/v1/custom_fields/${process.env.CAMPAIGN_ID}?token=${process.env.RD_TOKEN}`, {
                            opts: options.filter(res => res !== name)
                        })

                        if (response) console.log("deleted")

                    })


                return res.status(201).json("Deletado com sucesso")

            } catch (error) {
                console.log({
                    where: '[CAMPAIGN.DELETE]',
                    error
                })
                return res.status(401).json(error)
            }
        }

    }

}

export default new CampaignController