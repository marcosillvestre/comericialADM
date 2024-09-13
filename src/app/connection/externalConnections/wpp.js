import axios from 'axios'
import 'dotenv/config'

const headers = {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.UMBLER_TOKEN}`,
    ContentType: 'application/json'
}

export async function SendtoWpp(message, unity) {

    const messageBody = {
        message: message,
        chatId: unity === "Centro" ? process.env.UMBLER_CHAT_REM_ID_CENTRO : process.env.UMBLER_CHAT_REM_ID_PTB,
        organizationId: process.env.UMBLER_ORG_ID,

        "tempId": null,
        "file": null,
        "prefix": null,
        "isPrivate": false,
        "skipReassign": false,
        "automated": false,
    }

    await axios.post("https://app-utalk.umbler.com/api/v1/messages", messageBody, { headers })
        .then((data) => console.log(`enviado para o grupo ${unity} com sucesso`))
        .catch((err) => console.log(err.response.data))
}


export async function SendSimpleWpp(name, phone, message) {
    const messageBody = {
        "toPhone": phone,
        "fromPhone": process.env.FROM,
        "organizationId": process.env.UMBLER_ORG_ID,
        "message": message,
        "file": null,
        "skipReassign": false,
        "contactName": name
    }

    await axios.post("https://app-utalk.umbler.com/api/v1/messages/simplified", messageBody, { headers })
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

// await StartChatbot("marcos", "31 97337-5058", "ZuHsKJ5N9i3HZ8cD", "Início")