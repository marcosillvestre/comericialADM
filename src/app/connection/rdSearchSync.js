import axios from "axios";
import "dotenv/config";
import { findYourValueForCustomFields } from "../../config/customFieldFinder.js";
import { DateTransformer } from "../../config/DateTransformer.js";
import { PastCodes } from "../../config/getLastMonday.js";
import { installments } from '../../config/installments.js';
import prisma from '../../database/database.js';
import { RegisterFinder } from "../../database/registers/register.find.js";
import { getContactsWithId } from './externalConnections/rdStation.js';
import { StartCicleWhenNewRegisterIsCreated } from "./externalConnections/trello.js";
import { getDataFromCep } from "./externalConnections/viaCep.js";
import { SendSimpleWpp } from "./externalConnections/wpp.js";
const comebackDays = 3
const options = { method: 'GET', headers: { accept: 'application/json' } };

const { getCodeFor2Day, codeContractMaker, getLastWeekMondayCode } = new PastCodes()
const { registerFinderForCustomFields } = new RegisterFinder()


async function UpdateTheCustomFields() {
    fetch(`https://crm.rdstation.com/api/v1/custom_fields?token=${process.env.RD_TOKEN}&for=deal`, options)
        .then(response => response.json())
        .then(async res => {
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


const calcularDiferencaAnos = async (dataString) => {
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
        console.log(error)
    }
}


const getServiceByName = async (Param) => {
    const response = await prisma.services.findFirst({
        where: {
            name: {
                contains: Param,
                mode: "insensitive"
            }
        }
    })

    return response

}
export const gatheringDataForDatabase = async (deals) => {
    const data = []
    try {

        for (const deal of deals) {

            const { id, deal_custom_fields, user, name,
                deal_products: [service], deal_stage } = deal

            const { phone, email, contacts } = await getContactsWithId(id)

            if (!service || !contacts) continue

            const { name: pipeName } = await GetPipelineStage(deal_stage.id)
            const CEP = await findYourValueForCustomFields('CEP', deal_custom_fields)

            const viaCepData = await getDataFromCep(CEP)

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

                if (result["O responsável e o aluno são a mesma pessoa ?"] === "Sim" && contacts.birthday) {
                    result["Data de nascimento do aluno"] = new Date(`${contacts.birthday?.year}/${contacts.birthday?.month}/${contacts.birthday?.day}`).toLocaleDateString()
                    result["Nome do aluno"] = contacts.name
                }


                const splited = pipeName.split(" ")
                const [Classe, Subclasse] = service.name.split(' - ');

                const code = await codeContractMaker(result["Vendedor"])

                const studentAge = await calcularDiferencaAnos(result["Data de nascimento do aluno"])

                const installment = await installments(
                    result["Data de vencimento da primeira parcela"],
                    result["Número de parcelas do curso"],
                    0
                )

                const endDate = await installment[installment.length - 1]?.due_date
                const { course, workLoad, modality } = await getServiceByName(service.name)

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
                    "Data de nascimento do  responsável": contacts.birthday ? `${contacts.birthday?.day}/0${contacts.birthday?.month}/${contacts.birthday?.year}` : undefined,
                    "Tipo/ modalidade": modality,
                    "Carga horário do curso": workLoad,
                    "Nome do responsável": contacts?.name ? contacts.name : undefined,
                    "Profissão": contacts?.title ? contacts.title : undefined,
                    "Data de vencimento da última parcela": endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Erro para calcular data de fim',
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
                customFields: json
            })

        }
        return data
    } catch (error) {
        console.log(error)
        await SendSimpleWpp("marcos", process.env.MARCOS, JSON.stringify(`[GATHERINGDATAFORDATABASE]: ${error}`, null, 2))
        return []
    }
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
            // console.log(deals[0])
            // return
            if (total > 0) await LoopForStoreNewRegisters(deals)
        })
}

export default NewSearchSync
NewSearchSync()

// const t = [

//     "Ravi Murari Fernandes Veira de Queiros",
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
//                 resp ? StartCicleWhenNewRegisterIsCreated(resp) : console.log(`${res} não encontrado ✖️`)
//             })
//             .catch(err => console.log(err))
//     })
// }
// achadorEMandadorParaOTrello()

// 01JJYP6XW329EBG6JNXDCYAHB5