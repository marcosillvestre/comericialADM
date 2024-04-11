import axios from 'axios';
import "dotenv/config";
import { addUsefullDays } from './engineSearch.js';


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
                            let data = res.data
                            let today = new Date();
                            let futureDate = addUsefullDays(today, 7);


                            const list = {
                                "Centro": "65ef33908563ab863429d9be",
                                "PTB": "",
                                "Golfinho Azul": ""
                            }
                            const template = {
                                "Centro": "65ef349153693a762000eaef",
                                "PTB": "",
                                "Golfinho Azul": ""
                            }
                            const description = {
                                'id': data.id,
                                'Nome do Aluno': data.name,
                                'Nome do responsável': data.deal_custom_fields.filter(res => res.custom_field.label.includes('Nome  do responsável')).map(res => res.value)[0],
                                'turma': `${data.deal_custom_fields.filter(res => res.custom_field.label.includes('Dia de aula')).map(res => res.value)[0]}/${data.deal_custom_fields.filter(res => res.custom_field.label.includes('Horário de Inicio')).map(res => res.value)[0]}-${data.deal_custom_fields.filter(res => res.custom_field.label.includes('Horário de fim')).map(res => res.value)[0]}/${data.deal_custom_fields.filter(res => res.custom_field.label.includes('Professor')).map(res => res.value)}`,
                                'Data de término do contrato': data.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de fim do contrato')).map(res => res.value)[0],
                                'Valor da mensalidade atual': data.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor total da parcela')).map(res => res.value)[0],
                                'Material atual': data.deal_custom_fields.filter(res => res.custom_field.label.includes('Material didático')).map(res => res.value)[0],

                                'FEEDBACK DO ALUNO': "",
                                'Comportamento': "",
                                'Notas': "",
                                'Desenvolvimento': "",
                                'RESUMO DA REUNIÃO': "",
                            }

                            const body = {
                                name: data.name,
                                desc: JSON.stringify(description, null, 2).replace("{", "").replace("}", ""),
                                pos: 'top',
                                due: futureDate,
                                idList: list[unity], start: today,
                                idCardSource: template[unity]
                                // "Número do responsável": `${data.contacts.map(res => res.phones).map(res => res[0]?.phone)[0]}`,
                            }


                            await axios
                                .post(`https://api.trello.com/1/cards?idList=${list[unity]}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`, body)
                                .then(response => {
                                    console.log(response.data.shortUrl)
                                })
                                .catch(err => console.log("trello ,", err))

                        })
                        .catch((err) => console.log("rd, ", err))


                }
            }
        })
        .catch(err => console.log(err))
}



const renewContracts = async () => {
    for (const unity of unities) {
        await updateRdData(unity)
    }
}


export default renewContracts