import axios from 'axios';
import "dotenv/config";
import { SendRematriculaToTrello } from './trello.js';


const stageToBeUpdated = {
    "Centro": "64badc42874ccc000dd4ed37",
    "PTB": "64bacb30693f48000d57686d",

    "backCentro": "64badc42874ccc000dd4ed34",
    "backPTB": "64bacb30693f48000d57686a",

    "winCentro": "64badc42874ccc000dd4ed38",
    "loseCentro": "64badc42874ccc000dd4ed35",

    "winPTB": "64bacb30693f48000d57686e",
    "losePTB": "64bacb30693f48000d57686b",
}

export async function updateStageRd(data, unity) {
    await axios.put(`https://crm.rdstation.com/api/v1/deals/${data.id}?token=${process.env.RD_TOKEN}`,
        { deal_stage_id: stageToBeUpdated[unity] })
        .then(async (res) => {
            if (unity.includes("back") || unity.includes("win") || unity.includes("lose")) return
            await SendRematriculaToTrello(res.data, unity)
        })
        .catch((err) => console.log("rd, ", err.response.data.name ? { name: err.response?.data.name, errors: err.response?.data.errors } : err))
}


async function getDealId(name, aluno, classe) {
    try {
        const { data } = await axios.get(`https://crm.rdstation.com/api/v1/deals?token=${process.env.RD_TOKEN}&name=${name}`)
        const { total, deals } = data
        const result = []

        for (const element of deals) {
            let nameAluno = element.deal_custom_fields.filter(res =>
                res.custom_field.label.includes('Nome do aluno'))
                .map(res => res.value)[0]

            let relatedClasse = element.deal_custom_fields.filter(res => res.custom_field.label.includes('Classe')).map(res => res.value)[0]

            if (nameAluno.toLowerCase().includes(aluno.toLowerCase()) && relatedClasse === classe) result.push({ id: element.id, user: element.user })
        }

        return result

    } catch (error) {
        console.log(error)
        return error
    }

}




export async function createTasks(name, aluno, classe) {
    const scheduledFor90Days = new Date()
    scheduledFor90Days.setDate(scheduledFor90Days.getDate() + 90)

    const deals = await getDealId(name, aluno, classe)

    deals.forEach(async element => {

        const { id, user } = element

        const body = {
            date: scheduledFor90Days,
            deal_id: id,
            notes: "Colher FeedBack com o aluno para teste de satisfação",
            subject: "FeedBack",
            type: "call",
            user_ids: [user.id]

        }
        await axios.post(`https://crm.rdstation.com/api/v1/tasks?token=${process.env.RD_TOKEN}`, body)
            .then(res => { if (res) console.log("FeedBack agendado") })
            .catch(error => console.log(error))
    });
}




export async function getDealIdWithCPf(name, cpf, contract) {

    // console.log(name, cpf, contract)


    try {
        const { data } = await axios.get(`https://crm.rdstation.com/api/v1/deals?token=${process.env.RD_TOKEN}&name=${name}`)
        const { total, deals } = data
        let result;

        for (const element of deals) {

            const cField = element.deal_custom_fields

            let realatedCPF = cField.filter(res =>
                res.custom_field.label.includes('CPF'))
                .map(res => res.value)[0]

            let contrato = cField.filter(res =>
                res.custom_field.label.includes('Nº do contrato'))
                .map(res => res.value)[0]

            let pAula = cField.filter(res =>
                res.custom_field.label.includes('Data da primeira aula'))
                .map(res => res.value)[0]

            let unidade = cField.filter(res =>
                res.custom_field.label.includes('Unidade'))
                .map(res => res.value)[0]

            let tel = element.contacts.map(res => res.phones).map(res => res[0]?.phone)[0]

            let curso = cField.filter(res =>
                res.custom_field.label.includes('Curso'))
                .map(res => res.value)[0]

            let background = cField.filter(res =>
                res.custom_field.label.includes('Background'))
                .map(res => res.value)[0]

            if (contract) {
                if (realatedCPF === cpf && contrato === contract) return result = {
                    key: "contrato", value: contrato, tel, pAula, unidade, curso, background
                }
            } else {
                if (realatedCPF === cpf) return result = {
                    key: "name", value: element.name, tel, pAula, unidade, curso, background
                }
            }
        }
        return result

    } catch (error) {
        console.log(error)
        return error
    }

}


