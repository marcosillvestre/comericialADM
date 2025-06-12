import axios from 'axios'
import 'dotenv/config'
import { DateTransformer } from '../../../utils/functions/DateTransformer.js'
const headers = {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.UMBLER_TOKEN}`,
    ContentType: 'application/json'
}


export async function SendGroupAlerts(message, chat) {

    const messageBody = {
        message: message,
        chatId: chat,
        organizationId: process.env.UMBLER_ORG_ID,

        "tempId": null,
        "file": null,
        "prefix": null,
        "isPrivate": false,
        "skipReassign": false,
        "automated": false,
    }


    await axios.post("https://app-utalk.umbler.com/api/v1/messages", messageBody, { headers })
        .then(() => console.log(`Enviado com sucesso`))
        .catch((err) => console.log(err.response.data))
}

async function getAllTags() {
    const query = new URLSearchParams({
        organizationId: process.env.UMBLER_ORG_ID,
        Skip: 0,
        Take: 50,
    });

    try {
        const { data } = await axios.get(`https://app-utalk.umbler.com/api/v1/tags/?${query}`, { headers })

        return data;
    } catch (error) {
        console.log({
            where: "[GETTAGS]",
            error
        })

        return null
    }

}


async function putTagsToContacts(idContact, arrayTagsId) {
    try {

        const { items } = await getAllTags();

        const tagIds = arrayTagsId.map(res => items.find(item => item.name === res).id)

        const body = {
            tagIds,
            organizationId: process.env.UMBLER_ORG_ID,
        }

        await axios.post(
            `https://app-utalk.umbler.com/api/v1/chats/${idContact}/tags/list`,
            body,
            { headers }
        )
            .then(() => console.log("Tags atribuidas com sucesso"))
            .catch((err) => console.log(err.response));


    } catch (error) {

        console.log({
            where: "[PUTTAGS]",
            error
        })
    }

}



export async function SendSimpleWpp(name, phone, message, tag) {
    const messageBody = {
        "toPhone": phone,
        "fromPhone": process.env.FROM,
        "organizationId": process.env.UMBLER_ORG_ID,
        "message": message,
        "file": null,
        "skipReassign": false,
        "contactName": name
    }

    try {
        const { data } = await axios.post(
            "https://app-utalk.umbler.com/api/v1/messages/simplified",
            messageBody,
            { headers }
        )
        if (!data) throw new Error("Mensagem não enviada")

        const { contactId: _, chat: { id } } = data;

        if (Array.isArray(tag)) await putTagsToContacts(id, tag)

        return data

    } catch (error) {

        console.log(error)
        return new Error(error)

    }

}

export async function ScheduleBotMessages(name, phone, date, botName) {

    const isoDate = await DateTransformer(date)
    const schedule = new Date(isoDate)
    schedule.setDate(schedule.getDate() - 1)

    schedule.setUTCHours(17, 25, 0, 0)

    const messageBody = {
        "toPhone": phone,
        "fromPhone": process.env.FROM,
        "organizationId": process.env.UMBLER_ORG_ID,
        "message": "message",
        "file": null,
        "contactName": name,

        "dateSendAtUTC": schedule,

        "botId": process.env.BOT_LEMBRETE,
        "botTriggerName": botName,
        "botName": botName
    }


    await axios.post("https://app-utalk.umbler.com/api/v1/scheduled-messages", messageBody, { headers })
        .then(() => console.log(`enviado para ${name} com sucesso`))
        .catch(err => console.log(err.response.data))

}



export async function StartChatbot(name, phone, chatBotId, botName) {

    const messageBody = {
        "toPhone": phone,

        "fromPhone": process.env.FROM,
        "botId": chatBotId,
        "triggerName": botName,
        "organizationId": process.env.UMBLER_ORG_ID,

        "contactName": name,
    }
    await axios.post("https://app-utalk.umbler.com/api/v1/chats/start-bot", messageBody, { headers })
        .then(() => console.log(`enviado para ${name} com sucesso`))
        .catch(err => console.log(err.response.data))

}
