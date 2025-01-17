import axios from 'axios'
import 'dotenv'
import * as yup from 'yup'
import prisma from '../../../database/database.js'

class CampaignController {
    async store(req, res) {

        const schema = yup.object().shape({
            name: yup.string().required(),
            description: yup.string().required(),
            descountType: yup.string().required(),
            affectedParcels: yup.number().required(),
            destiny: yup.string().required(),
            value: yup.number().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { name, affectedParcels, descountType, description, value, destiny } = req.body

            const storeCampaign = async (name, affectedParcels, descountType, description, value, destiny) => {

                await prisma.campaign.create({
                    data: {
                        name,
                        affectedParcels,
                        descountType,
                        description,
                        value,
                        for: destiny

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
            console.log(error)
            return res.status(401).json(error)
        }


    }
    async index(req, res) {
        try {

            const campaigns = await prisma.campaign.findMany()

            return res.status(200).json(campaigns)
        } catch (error) {
            console.log(error)
            return res.status(401).json(error)

        }
    }

    async update(req, res) {
        const { id, key, value } = req.body

        const schema = yup.object().shape({
            key: yup.string().required(),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            await prisma.campaign.update({
                where: {
                    id
                },
                data: {
                    [key]: value
                }
            })


            return res.status(200).json("Editado com successo")

        } catch (error) {
            console.log(error)
            return res.status(401).json(error)
        }
    }

    async delete(req, res) {
        const { id } = req.query


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
                console.log(error)
                return res.status(401).json(error)
            }
        }




    }


}

export default new CampaignController