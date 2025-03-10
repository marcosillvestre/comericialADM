import axios from "axios";
import 'dotenv';
import { StringsMethods } from "../../../config/serializerStrings.js";
import { getContactsWithId, updateStageRd } from "./rdStation.js";
import { SendGroupAlerts, SendSimpleWpp } from "./wpp.js";

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
        console.log(error)
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


    const filtered = await array.filter(res => spacesAndLowerCase(res.name).includes(spacesAndLowerCase(name)))

    if (filtered.length > 0) {
        try {

            filtered.map(res => {
                const md = res.desc.replace(/^\s*-\s*\*\*.*(\n|\r\n|\r)?/gm, '');
                // console.log(md)

                const material = JSON.parse("{" + md + "}")

                if (!material.Material
                    .every(res => res === "Outros" || res === "Office")) return res

            })
        } catch (error) {
            console.log(error)
            console.log(name)
        }

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

            await SendSimpleWpp("Marcos",
                process.env.MARCOS, `${JSON.stringify(element.nome)},
            checklist não encontrado no trello // ${where}`
            )

            console.log("checkList não encontrado")
            return
        }

        const { id: checkItem, state } = checkList


        try {
            let { data } = await axios
                .put(`https://api.trello.com/1/cards/${id}/checkItem/${checkItem}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`,
                    { state: "complete" })
            return data.state
        } catch (error) {
            return error.response.data
        }

    }


}


//action
export async function CreateCommentOnTrello(name, unity, message) {
    const { id } = await GotIdFromCardOnList(name, unity)

    if (!id) {
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
        'Nome do responsável': data.deal_custom_fields.filter(res => res.custom_field.label.includes('Nome do responsável')).map(res => res.value)[0],
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
        .then(async url => {
            let message = `${body.name} -- está a dois meses de vencer seu contrato, acesse o link do trello para começar o processo de rematrícula : ${url}`;

            let chat = response.customFields["Unidade"] === "Centro" ? process.env.UMBLER_CHAT_REM_ID_CENTRO : process.env.UMBLER_CHAT_REM_ID_PTB

            if (url) await SendGroupAlerts(
                message,
                chat
            )
                ;
        })
        .catch(async err => {
            console.log(err)
            await updateStageRd(data, "back" + unity)
        })

}


const templates = {
    "Golfinho azul/Novo aluno": process.env.PTB_TEMPLATE,
    'PTB/Novo aluno': process.env.PTB_TEMPLATE,
    'Centro/Novo aluno': process.env.CENTRO_TEMPLATE,

    "Golfinho azul/Ex-aluno": process.env.PTB_TEMPLATE,
    'PTB/Ex-aluno': process.env.PTB_TEMPLATE,
    'Centro/Ex-aluno': process.env.CENTRO_TEMPLATE,

    "Golfinho azul/Aluno vigente": process.env.PTB_TEMPLATE,
    'PTB/Aluno vigente': process.env.PTB_TEMPLATE,
    'Centro/Aluno vigente': process.env.CENTRO_TEMPLATE,

    "Golfinho azul/Rematrícula": process.env.PTB_TEMPLATE_REM,
    'PTB/Rematrícula': process.env.PTB_TEMPLATE_REM,
    'Centro/Rematrícula': process.env.CENTRO_TEMPLATE_REM
}

const idList = {
    "Golfinho Azul/Novo aluno": process.env.PTB_LIST,
    'PTB/Novo aluno': process.env.PTB_LIST,
    'Centro/Novo aluno': process.env.CENTRO_LIST,

    "Golfinho Azul/Ex-aluno": process.env.PTB_LIST,
    'PTB/Ex-aluno': process.env.PTB_LIST,
    'Centro/Ex-aluno': process.env.CENTRO_LIST,

    "Golfinho Azul/Aluno vigente": process.env.PTB_LIST,
    'PTB/Aluno vigente': process.env.PTB_LIST,
    'Centro/Aluno vigente': process.env.CENTRO_LIST,

    "Golfinho Azul/Rematrícula": process.env.PTB_LIST_REM,
    'PTB/Rematrícula': process.env.PTB_LIST_REM,
    'Centro/Rematrícula': process.env.CENTRO_LIST_REM

}

export function addUsefullDays(data, diasUteis) {
    var dataAtual = new Date(data);
    var diasAdicionados = 0;

    while (diasAdicionados < diasUteis) {
        dataAtual.setDate(dataAtual.getDate() + 1);

        if (dataAtual.getDay() !== 0 && dataAtual.getDay() !== 6) {
            diasAdicionados++;
        }
    }

    return dataAtual;
}

export async function StartCicleWhenNewRegisterIsCreated(object) {

    let today = new Date();
    let futureDate = addUsefullDays(today, 7);

    const { name, customFields } = object

    try {

        const { phone, email } = await getContactsWithId(object.id)

        const description = {
            "background": customFields["Background do Aluno"],
            "nome do aluno": customFields["Nome do aluno"],
            "idade ": customFields["Idade do Aluno"],
            "vendedor": customFields["Vendedor"],
            "responsável": name,
            "whatsapp": phone,
            "email": email,
            "Precisa de nivelamento": customFields["Precisa de nivelamento?"],
            "Professor": customFields["Professor"],
            "Dia de aula": customFields["Dia de aula"],
            "Dia da Primeira aula": customFields["Data da primeira aula"],
            "Horario": `${customFields["Horário de Inicio"]}  às  ${customFields["Horário de fim"]}`,
            "Caga Horaria do curso": customFields["Carga horário do curso"],
            "Curso": customFields["Curso"],
            "Classe": customFields["Classe"],
            "Sub Classe": customFields["Subclasse"],
            "Material": customFields["Material didático"],
            "modalidade": customFields["Tipo/ modalidade"],
            "Formato das aulas": customFields["Formato de Aula"],
            "anotações": customFields["Observações importantes para o pedagógico:"],
            "Valor do material": customFields["Valor total do material didático"],
            "Vaor da taxa de matricula": customFields["Valor de taxa de matrícula"],
            "Valor da mensalidade": customFields["Valor total da parcela"],
        }


        const body = {
            name: name,
            desc: JSON.stringify(description, null, 2).replace("{", "").replace("}", ""),
            pos: 'bottom',
            due: futureDate,
            start: today,
            idList: idList[customFields["Unidade"].concat("/").concat(customFields["Background do Aluno"])],
            idCardSource: templates[customFields["Unidade"].concat("/").concat(customFields["Background do Aluno"])]
        }


        await CardCreationOnTrello(body)
            .then(async url => {
                let message = `
🆕🆕🆕🆕🆕🆕🆕🆕🆕🆕🆕🆕

> *${body.name}*
 
Nome do aluno: *${customFields["Nome do aluno"]}*

Turma: *${customFields["Horário de Inicio"]}* às *${customFields["Horário de fim"]}* no dia *${customFields["Data da primeira aula"]}*

Professor: *${customFields["Professor"]}*

Material didático: *${customFields["Material didático"]}*

Responsável pela venda: *${customFields["Vendedor"]}*

> Comece o processo de conferência dele no trello através desse link :

${url}`


                let conference = `> *${body.name}* 

Foi cadastrado no sistema de comissão.
`
                let chat = customFields["Unidade"] === "Centro" ?
                    process.env.UMBLER_CHAT_REM_ID_CENTRO : process.env.UMBLER_CHAT_REM_ID_PTB
                await Promise.all([
                    SendGroupAlerts(message, chat),
                    SendSimpleWpp("Carolina", process.env.CAROLINA, conference),
                ])

            })

        return true
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}
