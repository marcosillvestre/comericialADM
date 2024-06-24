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
        tempId: null,
        file: null,
        prefix: null,
        isPrivate: false,
        skipReassign: false,
    }

    await axios.post("https://app-utalk.umbler.com/api/v1/messages", messageBody, { headers })
        .then(() => console.log('enviado com sucesso'))
        .catch((err) => console.log(err.response.data))
}


export async function SendSimpleWpp(name, phone, message) {
    const messageBody = {
        "toPhone": phone,
        "fromPhone": "+5531987371953",
        "organizationId": process.env.UMBLER_ORG_ID,
        "message": message,
        "file": null,
        "skipReassign": false,
        "contactName": name
    }

    await axios.post("https://app-utalk.umbler.com/api/v1/messages/simplified", messageBody, { headers })
        .then(() => console.log('enviado com sucesso'))
        .catch(err => console.log(err.response.data))

}
