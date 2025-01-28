import "dotenv/config";
import prisma from '../../database/database.js';
import { getContactsWithId } from './externalConnections/rdStation.js';
import { CardCreationOnTrello } from './externalConnections/trello.js';
import { SendSimpleWpp, SendtoWpp } from './externalConnections/wpp.js';

const comebackDays = 3
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
async function trelloCreateCard(object) {


    let today = new Date();
    let futureDate = addUsefullDays(today, 7);

    const { name, customFields } = object


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
        idList: idList[customFields["Unidade"].concat("/").concat(customFields["Background do Aluno"])],
        idCardSource: templates[customFields["Unidade"].concat("/").concat(customFields["Background do Aluno"])]
    }


    await CardCreationOnTrello(body)

        .then(async url => {
            let message = `> *${body.name}*

Foi cadastrado no sistema de comissão, voce pode encontra-lo também no trello por esse link: ${url}`

            1 > 2 && await SendtoWpp(message, unidade)


            let conference = `> *${body.name}* 
                
Foi cadastrado no sistema de comissão.
                `

            1 > 2 && await SendSimpleWpp("Carolina", process.env.CAROLINA, conference)

        })
}
async function NewSearchSync() {
    console.log("[new search]")
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
                            Phone: phone,
                            Email: email,
                            ...result
                        }

                    }

                    const json = await customFields()

                    await prisma.registers.create({
                        data: {
                            id,
                            name: json['Nome do responsável'],
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


// const t = [
//     "Flavia Soares Gomes",
// ]


// async function achadorEMandadorParaOTrello(params) {
//     t.map(async res => {

//         await prisma.registers.findFirst({
//             where: {
//                 OR: [
//                     {
//                         name: {
//                             contains: res,
//                             mode: "insensitive"
//                         }
//                     },
//                     {
//                         customFields: {
//                             path: ["Nome do aluno"],
//                             string_contains: res
//                         }
//                     }
//                 ]
//             }
//         })
//             .then(resp => {
//                 resp ? trelloCreateCard(resp) : console.log(`${res} não encontrado ✖️`)
//             })
//             .catch(err => console.log(err))
//     })
// }
// achadorEMandadorParaOTrello()
