import axios from 'axios';
import "dotenv/config";
import updateStageRd from './externalConnections/rdStation.js';

const funis = {
    "Centro": "64badc42874ccc000dd4ed2e",
    "PTB": "64bacb30693f48000d576869",
}
const stages = {
    "Centro": "64badc42874ccc000dd4ed34",
    "PTB": "64bacb30693f48000d57686a",
}






let page = 1

async function updateRdData(unity, page) {
    console.log(unity)

    await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=200&page=${page}&token=${process.env.RD_TOKEN}&deal_pipeline_id=${funis[unity]}&deal_stage_id=${stages[unity]}`)
        .then(async response => {
            const deals = response.data.deals

            let array = []
            for (const data of deals) {
                let index = data.deal_custom_fields.findIndex(item => item.custom_field.label === "Data de fim do contrato")
                let filtered = { value: data.deal_custom_fields[index].value, id: data.id }

                filtered.value !== null && array.push(filtered)
            }

            const date = new Date()
            date.setMonth(date.getMonth() + 2)
            const postMonth = date.toLocaleDateString()
            let splitedDate = postMonth.split("/")
            let monthAndYear = `${splitedDate[1]}/${splitedDate[2]}`


            for (let i = 0; i < array.length; i++) {
                const value = array[i].value.split("/")
                const newValue = `${value[1]}/${value[2]}`

                if (newValue === monthAndYear) {
                    // console.log(data.name)
                    updateStageRd(array[i], unity)
                }
            }

            if (deals.length === 200) {
                page = page + 1
                updateRdData(unity, page)
            }
        })
        .catch(err => console.log(err))
}





const renewContracts = async () => {
    console.log("renew")
    for (const unity of ["Centro", "PTB"]) {
        await updateRdData(unity, page)
    }
}


export default renewContracts