import axios from 'axios';
import "dotenv/config";
import { SendRematriculaToTrello } from './trello.js';
import { SendSimpleWpp } from './wpp.js';


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


export async function getContactsWithId(id) {

    const [{ data: contacts }, { data: deal }] = await Promise.all([
        axios.get(`https://crm.rdstation.com/api/v1/deals/${id}/contacts?token=${process.env.RD_TOKEN}`),
        axios.get(`https://crm.rdstation.com/api/v1/deals/${id}?token=${process.env.RD_TOKEN}`),
    ])

    return {
        deal,
        phone: contacts.contacts[0] ? contacts.contacts[0].phones[0]?.phone : "",
        email: contacts.contacts[0] ? contacts.contacts[0].emails[0]?.email : "",
        contacts: contacts.contacts[0] ? contacts.contacts[0] : ""
    }

}


export async function winADeal(id) {
    try {

        const response = await axios.put(`https://crm.rdstation.com/api/v1/deals/${id}?token=${process.env.RD_TOKEN}`, {
            deal: {
                win: "true"
            }
        })

        return response.data
    } catch (error) {
        if ('data' in error.response) return error.response.data
        await SendSimpleWpp("marcos", process.env.MARCOS, `Erro ao dar contrato como ganho: ${id}`)

    }
}


export async function createNewCustomField(params) {
    try {


        await axios.
            post(`https://crm.rdstation.com/api/v1/custom_fields?token=${process.env.RD_TOKEN}`, {
                custom_field: {
                    "allow_new": false,
                    "for": "deal",
                    "opts": params.options,
                    "label": params.name,
                    "required": true,
                    "type": params.type,
                    "unique": true,
                    "order": params.order
                }
            })

        return true
    } catch (error) {

        return new Error(error)
    }

}


export async function getOptionsFromRdCustomFields(id) {
    try {
        const { data: { opts } } = await axios.get(`https://crm.rdstation.com/api/v1/custom_fields/${id}?token=64c1219c7de4220029d55fc7`)
        return opts
    } catch (error) {

        return new Error({
            where: "[PRODUCT.OPTIONS]",
            what: `${error}`
        })
    }
}

export async function updateRdOptionsCustomFields(id, params) {
    try {


        await axios.
            put(`https://crm.rdstation.com/api/v1/custom_fields/${id}?token=${process.env.RD_TOKEN}`, {
                custom_field: {
                    "opts": params,
                }
            })

        return true
    } catch (error) {

        return new Error(error)
    }
}

export async function deleteCustomField(id) {
    try {
        await axios.
            delete(`https://crm.rdstation.com/api/v1/custom_fields/${id}?token=${process.env.RD_TOKEN}`)

        return true
    } catch (error) {

        return new Error(error)
    }
}


export async function CreateProductsAtRD(product) {

    try {

        const { data } = await axios.post(`https://crm.rdstation.com/api/v1/products?token=${process.env.RD_TOKEN}`, {
            product
        })

        return data
    } catch (error) {
        return new Error(`product create error ${error}`)
    }

}

export async function CreateServicesAtRD(product) {

    try {
        const { data } = await axios.post(`https://crm.rdstation.com/api/v1/products?token=${process.env.RD_TOKEN}`, product)

        return data
    } catch (error) {
        return new Error({
            where: "[PRODUCT.CREATE]",
            what: `${error}`
        })
    }

}

export async function EditServicesAtRD(id, product) {

    try {
        const { data } = await axios.put(`https://crm.rdstation.com/api/v1/products/${id}?token=${process.env.RD_TOKEN}`, product)

        return data
    } catch (error) {

        return new Error({
            where: "[PRODUCT.EDIT]",
            what: `${error}`
        })
    }

}
export async function ReturnServiceAtRD(name) {

    try {
        const { data: { products } } = await axios.get(`https://crm.rdstation.com/api/v1/products?limit=50&token=${process.env.RD_TOKEN}`)

        return products.find(res => res.name.includes(name))

    } catch (error) {

        return new Error({
            where: "[PRODUCT.GET]",
            what: `${error}`
        })
    }

}



export async function Funnels(id) {

    if (!id) {

        try {
            const { data } = await axios.
                get(`https://crm.rdstation.com/api/v1/deal_pipelines?limit=1000&token=${process.env.RD_TOKEN}`)

            return data.filter(res => !res.name.toLowerCase().includes("teste"))
        } catch (error) {

            return error
        }
    }


    try {
        const { data } = await axios.
            get(`https://crm.rdstation.com/api/v1/deal_pipelines/${id}?token=${process.env.RD_TOKEN}`)

        return data
    } catch (error) {

        return error
    }

}