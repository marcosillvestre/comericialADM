import axios from "axios";
import { bodyFilterCustomFields } from "../../../config/customFieldFinder.js";
import { Funnels } from "../../connection/externalConnections/rdStation.js";


class ContractsController {

    async getContracts(req, res) {
        const { unity } = req.params
        const { take, skip } = req.query

        const { deal_stages } = await Funnels(unity)

        const { id } = deal_stages.find(res =>
            res.name.toLowerCase() === "matrícula" ||
            res.name.toLowerCase() === "contratos a renovar");


        try {
            await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=1000&token=${process.env.RD_TOKEN}&deal_pipeline_id=${unity}&deal_stage_id=${id}&page=${skip}&limit=${take}`)
                .then(async (response) => {
                    const array = []

                    const { total, deals } = response.data

                    for (const index of deals) {
                        const body = await bodyFilterCustomFields(index)
                        array.push(body)
                    }


                    return res.status(200).json({
                        contracts: array,
                        total: total,
                    })
                })

        } catch (error) {

            console.log({
                where: '[getrecent]',
                error
            })

            return res.status(400).json(error)
        }
    }


    async queryContracts(req, res) {
        const { unity } = req.params
        const { take, skip, name } = req.query

        const { deal_stages } = await Funnels(unity);

        const { id } = deal_stages.find(res =>
            res.name.toLowerCase() === "matrícula" ||
            res.name.toLowerCase() === "contratos a renovar");


        try {
            await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=1000&token=${process.env.RD_TOKEN}&name=${name}&deal_pipeline_id=${unity}&deal_stage_id=${id}&page=${skip}&limit=${take}`)
                .then(async (response) => {
                    const array = []

                    const { total, deals } = response.data

                    for (const index of deals) {
                        const body = await bodyFilterCustomFields(index)
                        array.push(body)
                    }


                    return res.status(200).json({
                        contracts: array,
                        total: total,
                    })
                })

        } catch (error) {

            console.log({
                where: '[getrecent]',
                error
            })

            return res.status(400).json(error)
        }
    }
}
export default new ContractsController()