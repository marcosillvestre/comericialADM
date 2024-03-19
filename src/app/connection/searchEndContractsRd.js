import axios from 'axios';
import "dotenv/config";


const funis = {
    "Centro": "64badc42874ccc000dd4ed2e",
    "PTB": "64bacb30693f48000d576869",
}
const stages = {
    "Centro": "64badc42874ccc000dd4ed34",
    "PTB": "64bacb30693f48000d57686a",
}
const stageToBeUpdated = {
    "Centro": "64badc42874ccc000dd4ed37",
    "PTB": "64bacb30693f48000d57686d",
}



const trelloList = {
    "": "65ef33a22afe99a8c6db54d6"
}


const unities = ["Centro", "PTB"]

async function updateRdData(unity) {
    await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=100&token=${process.env.RD_TOKEN}&deal_pipeline_id=${funis[unity]}&deal_stage_id=${stages[unity]}`)
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

                    await axios.put(`https://crm.rdstation.com/api/v1/deals/${array[i].id}?token=${process.env.RD_TOKEN}`,
                        { deal_stage_id: stageToBeUpdated[unity] })
                        .then(async (res) => {
                            console.log("old contracts updated")
                            let data = res.data
                            const list = "65ef33a22afe99a8c6db54d6"

                            const body = {
                                "Nome do Aluno": "",
                                "Nome do responsável": "",
                                "Turma": "",
                                "Número do responsável": "",
                                "Data de término do contrato": "",
                                "Valor da mensalidade atual": "",
                                "Material atual": "",
                            }

                            // await axios
                            // .post(`https://api.trello.com/1/cards?idList=${list}&key=${process.env.TRELLO_KEY}
                            // &token=${process.env.TRELLO_TOKEN}`, body)


                        })
                        .catch(() => console.log("something went wrong"))


                }
            }
        })
}




// updateRdData("Centro")

const renewContracts = () => {
    unities.map(async res => {
        await updateRdData(res)
    })
}

export default renewContracts