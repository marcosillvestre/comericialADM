import axios from "axios";
import 'dotenv';
import { StringsMethods } from "../../../config/serializerStrings.js";
import { updateStageRd } from "./rdStation.js";
import { SendSimpleWpp, SendtoWpp } from "./wpp.js";

const { spacesAndLowerCase } = new StringsMethods()

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




//create 
export async function CardCreationOnTrello(body) {

    try {
        const response = await axios.post(`https://api.trello.com/1/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`, body)

        console.log(`${body.name} foi enviado ao trello`)

        return response.data.shortUrl;

    } catch (error) {
        throw new Error(error)
    }

}

//get
async function getData(listId) {
    try {
        const { data } = await axios.get(`https://api.trello.com/1/lists/${listId}/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)

        return data

    } catch (error) {
        console.log(error.response.data)
        throw new Error(error)
    }
}

//filter
async function filteredData(name, array) {


    const filtered = array.filter(res =>
        spacesAndLowerCase(res.name)
            .includes(spacesAndLowerCase(name)))

    if (filtered.length > 0) {
        filtered.map(res => {
            const md = res.desc.replace(/^\s*-\s*\*\*.*(\n|\r\n|\r)?/gm, '');
            const material = JSON.parse("{" + md + "}")

            if (!material.Material
                .every(res => res === "Outros" || res === "Office")) return res

        })

    }
    return filtered
}

//get
async function GotIdFromCardOnList(name, unity) {


    let data;
    data = await getData(list[unity])

    const fill = await filteredData(name, data)


    if (fill.length === 0) {
        data = await getData(secList[unity])
        const secFill = await filteredData(name, data)

        const object = secFill.length !== 0 && secFill[0]
        return object
    }

    const object = fill.length !== 0 && fill[0]
    return object

}


//get
async function GetIdCheckListCard(name, unity, what) {
    let { id } = await GotIdFromCardOnList(name, unity)

    const splited = what.split("/")

    try {
        let { data } = await axios
            .get(`https://api.trello.com/1/cards/${id}/checklists?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)

        const filtered = data.find(res => res.name === splited[0])
        return filtered.checkItems.find(res => res.name === splited[1])

    } catch (error) {
        return error.response.data
    }
}


//action
export async function CompleteCheckPointOnTrello(array, unity, where) {
    for (let index = 0; index < array.length; index++) {
        const element = array[index];


        let { id } = await GotIdFromCardOnList(element.nome, unity)
        const checkList = await GetIdCheckListCard(element.nome, unity, where)

        if (!checkList) {

            await SendSimpleWpp("Marcos", process.env.MARCOS, `${array}, checklist não encontrado no trello // ${where}`)
            console.log("checkList não encontrado")
            return
        }

        const { id: checkItem, state } = checkList

        const newState = state === "incomplete" ? "complete" : "incomplete"
        try {
            let { data } = await axios
                .put(`https://api.trello.com/1/cards/${id}/checkItem/${checkItem}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,
                    { state: newState })
            return data.state
        } catch (error) {
            return error.response.data
        }

    }


}


//action
export async function CreateCommentOnTrello(name, unity, message) {
    const { id } = await GotIdFromCardOnList(name, unity)

    if (id === undefined) {
        await SendSimpleWpp("Marcos", `${process.env.MARCOS}`, `${name} --> não foi encontrado no trello.`)
        return "Não encontrado no Trello";
    }

    await axios.post(`https://api.trello.com/1/cards/${id}/actions/comments?text=${message}&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
    return message
}


//create 
export async function SendRematriculaToTrello(data, unity) {

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