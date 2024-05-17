import axios from "axios";

export async function CardCreationOnTrello(idList, body) {
    try {
        const response = await axios.post(`https://api.trello.com/1/cards?idList=${idList}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`, body)
        console.log(`${body.name} foi enviado ao trello`)
        return response.data.shortUrl

    } catch (error) {
        console.log(error)
    }

}