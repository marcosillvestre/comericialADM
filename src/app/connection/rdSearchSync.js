import axios from "axios";
import "dotenv/config";
import prisma from '../../database/database.js';
import { RegisterFinder } from "../../database/registers/register.find.js";
import { findYourValueForCustomFields } from "../../utils/functions/customFieldFinder.js";
import { DateTransformer } from "../../utils/functions/DateTransformer.js";
import { PastCodes } from "../../utils/functions/getLastMonday.js";
import { installments } from '../../utils/functions/installments.js';
import { getContactsWithId } from './externalConnections/rdStation.js';
import { StartCicleWhenNewRegisterIsCreated } from "./externalConnections/trello.js";
import { getDataFromCep } from "./externalConnections/viaCep.js";
import { SendSimpleWpp } from "./externalConnections/wpp.js";

const comebackDays = 5
const options = { method: 'GET', headers: { accept: 'application/json' } };

const { getCodeFor2Day, codeContractMaker, getLastWeekMondayCode } = new PastCodes()
const { registerFinderForCustomFields } = new RegisterFinder()


async function UpdateTheCustomFields() {
    fetch(`https://crm.rdstation.com/api/v1/custom_fields?token=${process.env.RD_TOKEN}&for=deal`, options)
        .then(response => response.json())
        .then(async res => {
            console.log({ customFields: res.length })


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


export const calcularDiferencaAnos = async (dataString) => {
    if (!dataString) return undefined

    const dataFornecida = await DateTransformer(dataString)
    const hoje = new Date();

    let diferenca = hoje.getFullYear() - dataFornecida.getFullYear();

    // Ajusta a diferença se o aniversário ainda não ocorreu neste ano
    if (hoje.getMonth() < dataFornecida.getMonth() ||
        (hoje.getMonth() === dataFornecida.getMonth() && hoje.getDate() < dataFornecida.getDate())) {
        diferenca--;
    }

    return diferenca;
}


async function GetPipelineStage(id) {
    try {
        const { data: { deal_pipeline } } = await axios.get(`https://crm.rdstation.com/api/v1/deal_stages/${id}?token=${process.env.RD_TOKEN}`)

        return deal_pipeline
    } catch (error) {
        console.log({ where: "[GETPIPELINESRD]", error })
    }
}


const getServiceByName = async (Param) => {
    const response = await prisma.service.findFirst({
        where: {
            name: {
                contains: Param,
                mode: "insensitive"
            }
        }
    })

    return response

}

const getDateRD = (birthday) => {
    if (!birthday) return null;
    const { day, month, year } = birthday

    return month > 9 ? `${day}/${month}/${year}` : `${day}/0${month}/${year}`
}

export const gatheringDataForDatabase = async (deals) => {
    const data = []


    for (const deal of deals) {

        try {
            const { id, deal_custom_fields, user, name,
                deal_products: [service], deal_stage } = deal

            const { phone, email, contacts } = await getContactsWithId(id)

            if (!contacts) continue

            const { name: pipeName } = await GetPipelineStage(deal_stage.id)
            const CEP = await findYourValueForCustomFields('CEP', deal_custom_fields)

            const viaCepData = await getDataFromCep(CEP);
            if (!viaCepData) continue;

            const customFields = async () => {
                const cf = await prisma.customFields.findMany()
                const result = {}
                for (let index = 0; index < cf.length; index++) {
                    const element = cf[index];
                    const { name } = element;

                    result[name] = deal_custom_fields
                        .filter(res => res.custom_field.label === name)
                        .map(res => res.value)[0] || ""
                }

                if (result["Aluno é o próprio responsável?"] === "Sim" && contacts.birthday) {
                    result["Data de nascimento do aluno"] = await getDateRD(contacts.birthday)
                    result["Nome do aluno (se não for responsável próprio))"] = contacts.name
                }


                const splited = pipeName.split(" ")
                const [Classe, Subclasse] = service?.name.split(' - ');

                const code = await codeContractMaker(result["Vendedor"])

                const studentAge = await calcularDiferencaAnos(result["Data de nascimento do aluno"])

                const installment = await installments(
                    result["Data de Vencimento da Primeira Parcela"],
                    parseInt(result["Número de parcelas do curso"]),
                    0
                )

                const endDate = await installment[installment.length - 1]?.data_vencimento

                const { workLoad, modality } = await getServiceByName(service.name)
                const course = Classe.includes('Tecnologia') ? "Tecnologia" : Classe.includes('Español') ? "Espanhol" : "Inglês"

                return await {
                    ...result,
                    Endereco: viaCepData['logradouro'],
                    Bairro: viaCepData['bairro'],
                    Cidade: viaCepData['localidade'],
                    Uf: viaCepData['uf'],
                    Phone: phone,
                    Email: email,
                    Classe,
                    Subclasse,
                    Unidade: splited[splited.length - 1],
                    Curso: course,
                    "Data de nascimento do  responsável": await getDateRD(contacts.birthday),
                    "Tipo/ modalidade": modality,
                    "Carga horário do curso": workLoad,
                    "Nome do responsável": contacts?.name ? contacts.name : undefined,
                    "Profissão": contacts?.title ? contacts.title : undefined,
                    "Data de Vencimento da Última Parcela": endDate ? new Date(endDate).toLocaleDateString('pt-BR') : null,
                    "Nº do contrato": code,
                    "Idade do Aluno": studentAge,
                    "Background do Aluno": pipeName.includes("Rematrícula") ? "Rematrícula" : "Novo aluno",
                }

            }

            const json = await customFields()

            data.push({
                id,
                name: json['Nome do responsável'],
                owner: json['Vendedor'] || user.name,
                customFields: json,
                historic: {
                    create: {
                        responsible: "Automação",
                        information: {
                            field: "created_at",
                            text: "Esse registro acabou de ser criado",
                            from: "1",
                        }
                    }
                }
            })

        } catch (error) {
            console.log({ error, where: "[GATHERINGDATABASEDATA]" })

            await SendSimpleWpp(
                "marcos",
                process.env.MARCOS,
                JSON.stringify(`[GATHERINGDATAFORDATABASE]: ${error}`, null, 2))

            throw error
        }
    }

    return data;

}

async function LoopForStoreNewRegisters(deals) {
    let sucesso = false;

    const data = await gatheringDataForDatabase(deals)

    try {
        const results = await Promise.all(
            data.map(async (res) => {
                const saved = await prisma.registers.create({ data: res });
                if (!saved) return false;

                await StartCicleWhenNewRegisterIsCreated(saved)
                return true
            })
        );

        // Se pelo menos um registro foi salvo, retorna true
        sucesso = results.some((r) => r === true);
    } catch (error) {
        console.error("Sem registros para armazenar");
        if (error.meta?.target[0] === 'id') return sucesso = null
    }
    return sucesso;
}

async function NewSearchSync() {
    console.log("[NEW SEARCH]")
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
            if (total > 0) await LoopForStoreNewRegisters(deals)
        })
}

export default NewSearchSync

// const t = []

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
//                             path: ["Nome do aluno (se não for responsável próprio))"],
//                             string_contains: res
//                         }
//                     }
//                 ]
//             }
//         })
//             .then(resp => {
//                 resp ? StartCicleWhenNewRegisterIsCreated(resp) : console.log(`${res} não encontrado ✖️`)
//             })
//             .catch(err => console.log(err))
//     })
// }
// achadorEMandadorParaOTrello()



// const v = {
//     "Nome": "(AW) Marcos Silvestre",
//     "E-mail": "",
//     "Whatsapp": "+5531973375058",
//     "Curso": "Inglês",
//     Modalidade: "Online",
//     Unidade: "PTB, Betim"
// }


// await axios.post(
//     // "https://crm.rdstation.com/api/v1/contacts?token=64c1219c7de4220029d55fc7",
//     // t
//     "https://hook.us1.make.com/ojd5jbriukkssc6r3fn8vs7u9bl6bqws",
//     v
// )
//     .then(r => console.log(r))
//     .catch(r => console.log(r))]
