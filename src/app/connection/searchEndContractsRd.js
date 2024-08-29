import axios from 'axios';
import "dotenv/config";
import { addUsefullDays } from './engineSearch.js';
import { CardCreationOnTrello } from './externalConnections/trello.js';
import { SendtoWpp } from './externalConnections/wpp.js';

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

    "backCentro": "64badc42874ccc000dd4ed34",
    "backPTB": "64bacb30693f48000d57686a",
}


const unities = ["Centro", "PTB"]


let page = 1

async function updateRdData(unity, page) {
    console.log(unity)

    await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=500&page=${page}&token=${process.env.RD_TOKEN}&deal_pipeline_id=${funis[unity]}&deal_stage_id=${stages[unity]}`)
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


async function updateStageRd(data, unity) {


    await axios.put(`https://crm.rdstation.com/api/v1/deals/${data.id}?token=${process.env.RD_TOKEN}`,
        { deal_stage_id: stageToBeUpdated[unity] })
        .then(async (res) => {
            if (unity.includes("back")) return
            await SendToTrello(res.data, unity)
        })
        .catch((err) => console.log("rd, ", { name: err.response.data.name, errors: err.response.data.errors }))
}

async function SendToTrello(data, unity) {

    let today = new Date();
    let futureDate = addUsefullDays(today, 7);


    const list = {
        "Centro": "65ef33908563ab863429d9be",
        "PTB": "66cf89c6a58c322658c69e78",
        "Golfinho Azul": "66cf89c6a58c322658c69e78"
    }
    const template = {
        "Centro": "6638fc5b9626084978caff3d",
        "PTB": "66cf8d660197a91687bb7b09",
        "Golfinho Azul": "66cf8d660197a91687bb7b09"
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
        pos: 'bottom',
        due: futureDate,
        idList: list[unity],
        start: today,
        idCardSource: template[unity]
    }

    await CardCreationOnTrello(body)
        .then(url => {
            let message = `${body.name} -- está a dois meses de vencer seu contrato, acesse o link do trello para começar o processo de rematrícula : ${url}`;

            if (url) SendtoWpp(message, unity);
        })
        .catch(async err => {
            console.log(err)
            await updateStageRd(data, "back" + unity)
        })

}



const renewContracts = async () => {
    console.log("renew")
    for (const unity of unities) {
        await updateRdData(unity, page)
    }
}


export default renewContracts