import "dotenv/config";
import prisma from '../../database/database.js';
import { getContactsWithId } from './externalConnections/rdStation.js';
import { CardCreationOnTrello } from './externalConnections/trello.js';
import { SendSimpleWpp, SendtoWpp } from './externalConnections/wpp.js';

const comebackDays = 5
const options = { method: 'GET', headers: { accept: 'application/json' } };

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

async function UpdateTheCustomFields() {
    fetch(`https://crm.rdstation.com/api/v1/custom_fields?token=${process.env.RD_TOKEN}&for=deal`, options)
        .then(response => response.json())
        .then(res => {
            console.log(res.length)
            res.map(async (r, i) => {
                await prisma.customFields.upsert({
                    where: {
                        id: r.id,
                    },
                    create: {
                        id: r.id,
                        name: r.label,
                        type: r.type,
                        options: r.opts,
                        order: i,
                        required: r.required
                    },
                    update: {
                        name: r.label,
                        type: r.type,
                        options: r.opts,
                        order: i,
                        required: r.required
                    }

                })
            })
        })
}

async function trelloCreateCard(object) {


    let today = new Date();
    let futureDate = addUsefullDays(today, 7);

    const { name, customFields } = object

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
        "Professor": customFields["Professor"].professor,
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
        idList: idList[unidade.concat("/").concat(background)],
        idCardSource: templates[unidade.concat("/").concat(background)]
    }


    await CardCreationOnTrello(body)
        .then(async url => {
            let message = `> *${body.name}*

Foi cadastrado no sistema de comissão, voce pode encontra-lo também no trello por esse link: ${url}`

            await SendtoWpp(message, unidade)


            let conference = `> *${body.name}* 
                
Foi cadastrado no sistema de comissão.
                `

            await SendSimpleWpp("Carolina", process.env.CAROLINA, conference)

        })
}
async function NewSearchSync() {

    await UpdateTheCustomFields()

    const backDay = new Date()
    backDay.setDate(backDay.getDate() - comebackDays)
    const startDate = backDay.toISOString()

    const currentDate = new Date()
    const endDate = currentDate.toISOString()
    let limit = 200

    fetch(`https://crm.rdstation.com/api/v1/deals?limit=${limit}&token=${process.env.RD_TOKEN}&win=true&closed_at_period=true&start_date=${startDate}&end_date=${endDate}`, options)
        .then(response => response.json())
        .then(async response => {
            const { total, deals } = response
            console.log(total)
            if (total > 0) {

                // const dealsssss = [deals[0]]
                for (const deal of deals) {

                    const { id, deal_custom_fields, user, name } = deal

                    const { phone, email } = await getContactsWithId(id)

                    const customFields = async () => {
                        const cf = await prisma.customFields.findMany()
                        const result = {}

                        for (let index = 0; index < cf.length; index++) {
                            const element = cf[index];
                            const { name } = element;

                            result[name] = deal_custom_fields
                                .filter(res => res.custom_field.label.includes(name))
                                .map(res => res.value)[0] || ""
                        }

                        return await {
                            Phone,
                            Email,
                            ...result
                        }

                    }

                    const json = await customFields()

                    await prisma.registers.create({
                        data: {
                            id,
                            name: json['Nome  do responsável'],
                            owner: json['Vendedor'] || user.name,
                            customFields: json
                        }
                    })
                        .then(async response => {
                            await trelloCreateCard(response)
                                .then(trello => {

                                })
                        })
                        .catch((err) => {
                            if (err.meta) {
                                console.log(`${name} já está cadastrado no sistema : ${json['Unidade']} / ${user.name} `)
                            }
                            if (!err.meta) {
                                console.log("Error : " + err)
                            }
                        })
                }
            }
        })
    // .catch(err => console.log(err))
}

export default NewSearchSync


// const a = [
//     { color: "#d1d1d1", name: "Kit do aluno personalizado", sku: "KDA1KITKT", price: 145.00 },
//     { color: "#dde87f", name: "Stars and Heroes Starter Combo", sku: "9788543029047", price: 221.00 },
//     { color: "#dde87f", name: "Stars and Heroes Starter - SB - 1 st Ed - BK", sku: "9781292441597", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes Starter - WB - 1 st Ed - BK", sku: "9781292441696", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 1 ", sku: "9788543029818", price: 221.00 },
//     { color: "#dde87f", name: "Stars and Heroes 1 - SB - 1 st Ed - BK", sku: "9781292441580", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 1 - WB - 1 st Ed - BK", sku: "9781292441672", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 2 ", sku: "9788543029825", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 2 - SB - 1 st Ed - BK", sku: "9781292441573", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 2 - WB - 1 st Ed - BK", sku: "9781292441641", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 3 ", sku: "9788543029832", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 3 - SB - 1 st Ed - BK", sku: "9781292441702", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 3 - WB - 1 st Ed - BK", sku: "9781292441658", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 4 ", sku: "9788543029849", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 4 - SB - 1 st Ed - BK", sku: "9781292441719", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 4 - WB - 1 st Ed - BK", sku: "9781292441665", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 5 ", sku: "9788543029856", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 5 - SB - 1 st Ed - BK", sku: "9781292441726", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 5 - WB - 1 st Ed - BK", sku: "9781292441764", price: 111.00 },

//     { color: "#e8be7f", name: "World Link Intro - SB - 4TH ED - BK", sku: "9780357502105", price: 226.90 },
//     { color: "#e8be7f", name: "World Link Intro - WB - 3TH ED - BK", sku: "9781305647848", price: 119.90 },
//     { color: "#e8be7f", name: "World Link Intro - WB - 3TH ED - AP", sku: "WLIWB3AP", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 1 - SB - 4TH ED - BK", sku: "9780357502143", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 1 - WB - 4TH ED - BK", sku: "9780357503768", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 1 - WB - 4TH ED - AP", sku: "WL1WB4AP", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 2 - SB - 4TH ED - BK", sku: "9780357503867", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 2 - WB - 4TH ED - BK", sku: "9780357503867", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 2 - WB - 4TH ED - AP", sku: "WL2WB4AP", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 3- SB - 4TH ED - BK", sku: "", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 3 - WB - 4TH ED - BK", sku: "9780357503966", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 3 - WB - 4TH ED - AP", sku: "", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 4- SB - 4TH ED - BK", sku: "", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 4 - WB - 4TH ED - BK", sku: "9780357504062", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 4 - WB - 4TH ED - AP", sku: "WL4WB4AP", price: 21.20 },

//     { color: "#7fa7e8", name: "Short Course Adults - PK - 1st Ed- AP", sku: "SCA1PK1AP", price: 15.80 },
//     { color: "#7fa7e8", name: "Interchange Intro W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040419", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange Intro w/ PACK - SB+WB - 5th Ed - BK", sku: "9781009040556", price: 409.00 },
//     { color: "#7fa7e8", name: "Interchange Intro - WB - 5th Ed - AP", sku: "INIWB5AP", price: 24.70 },
//     { color: "#7fa7e8", name: "Interchange Intro - WB - 5th Ed - BK", sku: "9781316622377", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange Intro B - W/EBOOK - SB - 5th Ed - BK", sku: "9781009040433", price: 214.00 },
//     { color: "#7fa7e8", name: "Beginner Way Intro - WB - 1st Ed- AP", sku: "BWIWB1AP", price: 15.10 },
//     { color: "#7fa7e8", name: "Interchange 2 - W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040495", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange 1 - W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040440", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange 1 - WB - 5th Ed - BK", sku: "9781316622476", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange 1 - WB - 5th Ed - AP", sku: "IN1WB5AP", price: 24.70 },
//     { color: "#7fa7e8", name: "Interchange 1B - W/EBOOK - SB - 5th Ed - BK", sku: "9781009040488", price: 214.00 },
//     { color: "#7fa7e8", name: "Interchange 1B - WB - 5th Ed - BK", sku: "9781316622667", price: 162.00 },
//     { color: "#7fa7e8", name: "Interchange 2 - WB - 5th Ed - BK", sku: "9781316622698", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange 2 - WB - 5th Ed - AP", sku: "IN2WB5AP", price: 24.70 },
//     { color: "#7fa7e8", name: "Interchange 3 - W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040525", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange 3 - WB - 5th Ed - BK", sku: "9781316622766", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange 3 - WB - 5th Ed - AP", sku: "IN3WB5AP", price: 26.10 },
//     { color: "#7fa7e8", name: "Evolve 5 - SB - 1st Ed - BK", sku: "9781009230858", price: 325.00 },
//     { color: "#7fa7e8", name: "Evolve 5 - WB - 1st Ed - BK", sku: "9781108409070", price: 221.00 },
//     { color: "#7fa7e8", name: "Evolve 5 - WB - 1st Ed - AP", sku: "EV5WB1AP", price: 26.50 },
//     { color: "#7fa7e8", name: "Evolve 6 - SB - 1st Ed - BK", sku: "9781009230889", price: 325.00 },
//     { color: "#7fa7e8", name: "Evolve 6 - WB - 1st Ed - BK", sku: "9781108409094", price: 221.00 },
//     { color: "#7fa7e8", name: "Evolve 6 - WB - 1st Ed - AP", sku: "EV6WB1AP", price: 26.50 },

//     { color: "#81e87f", name: "Short Course Espanhol - PK - 1st Ed - AP", sku: "SCEPK1AP", price: 11.10 },
//     { color: "#81e87f", name: "Vitamina B1 -  SB - 1st Ed - BK", sku: "9788416782932", price: 284.55 },
//     { color: "#81e87f", name: "Vitamina B1 - WB - 1st Ed - BK", sku: "9788416782949", price: 178.43 },
//     { color: "#81e87f", name: "Vitamina B1 - WB - 1st Ed - AP", sku: "VB1WB1AP", price: 32.90 },
//     { color: "#81e87f", name: "Vitamina B2 - SB - 1st Ed - BK", sku: "9788416782963", price: 284.55 },
//     { color: "#81e87f", name: "Vitamina B2 -  WB - 1st Ed - BK", sku: "9788416782970", price: 178.43 },
//     { color: "#81e87f", name: "Vitamina B2 -  WB - 1st Ed - AP", sku: "VB2WB1AP", price: 32.90 },
//     { color: "#81e87f", name: "Vitamina Básico (A1-A2) - SB - 1st Ed - BK", sku: "9788419065230", price: 320.16 },
//     { color: "#81e87f", name: "Vitamina Básico (A1-A2) - WB - 1st Ed - BK", sku: "9788419065247", price: 203.51 },
//     { color: "#81e87f", name: "Vitamina Básico (A1-A2) - WB - 1st Ed - AP", sku: "VBAWB1AP", price: 37.30 },
// ]


// t(a)


// await await prisma.customFields.findFirst({
//     where: {
//         name: {
//             contains: "Material d"
//         }
//     }
// }).then(res => console.log(res))



