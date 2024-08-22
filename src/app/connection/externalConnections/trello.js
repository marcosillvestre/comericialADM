import axios from "axios";
import 'dotenv';
import { SendSimpleWpp } from "./wpp.js";

const list = {
    "Golfinho Azul": process.env.PTB_LIST,
    "PTB": process.env.PTB_LIST,
    "Centro": process.env.CENTRO_LIST
}

const secList = {
    "Golfinho Azul": "63cd8d2040968e01b02877ae",
    "PTB": "63cd8d2040968e01b02877ae",
    "Centro": "65ea38613c42b228b4ac315d"
}



export async function CardCreationOnTrello(body) {

    try {
        const response = await axios.post(`https://api.trello.com/1/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`, body)

        console.log(`${body.name} foi enviado ao trello`)

        return response.data.shortUrl;

    } catch (error) {
        throw new Error(error)
    }

}


async function getData(listId) {
    try {
        const { data } = await axios.get(`https://api.trello.com/1/lists/${listId}/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)

        return data

    } catch (error) {
        throw new Error(error)
    }
}


async function filteredData(name, array) {

    const filtered = array.filter(res => {
        const md = res.desc.replace(/^\s*-\s*\*\*.*(\n|\r\n|\r)?/gm, '');
        const material = JSON.parse("{" + md + "}")
        return res.name.includes(name) && material.Material.length > 1
    })

    return filtered
}

async function GotIdFromCardOnList(name, unity) {

    let data;
    data = await getData(list[unity])
    const fill = await filteredData(name, data)


    if (fill.length === 0) {
        data = await getData(secList[unity])
        const secFill = await filteredData(name, data)

        const { id } = secFill.length !== 0 && secFill[0]
        return id
    }

    const { id } = fill.length !== 0 && fill[0]
    return id

}


export async function CreateCommentOnTrello(name, unity, message) {
    const id = await GotIdFromCardOnList(name, unity)

    if (id === undefined) {
        await SendSimpleWpp("Marcos", `${process.env.MARCOS}`, `${name} --> não foi encontrado no trello.`)
        return "Não encontrado no Trello";
    }

    await axios.post(`https://api.trello.com/1/cards/${id}/actions/comments?text=${message}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
    return message
}
