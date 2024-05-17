import axios from 'axios'
import 'dotenv/config'

export async function SendtoWpp(message, unity) {
    const headers = {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.UMBLER_TOKEN}`,
        ContentType: 'application/json'
    }
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
}