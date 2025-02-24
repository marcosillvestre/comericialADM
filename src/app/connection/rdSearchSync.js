import axios from "axios";
import "dotenv/config";
import { findYourValueForCustomFields } from "../../config/customFieldFinder.js";
import { DateTransformer } from "../../config/DateTransformer.js";
import { PastCodes } from "../../config/getLastMonday.js";
import prisma from '../../database/database.js';
import { RegisterFinder } from "../../database/registers/register.find.js";
import { getContactsWithId } from './externalConnections/rdStation.js';
import { StartCicleWhenNewRegisterIsCreated } from "./externalConnections/trello.js";
import { getDataFromCep } from "./externalConnections/viaCep.js";

const comebackDays = 3
const options = { method: 'GET', headers: { accept: 'application/json' } };

const { getCodeFor2Day, codeContractMaker, getLastWeekMondayCode } = new PastCodes()
const { registerFinderForCustomFields } = new RegisterFinder()
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

const calcularDiferencaAnos = async (dataString) => {
    // const dataFornecida = new Date(dataString.split('/').reverse().join('-'));
    const dataFornecida = await DateTransformer(dataString)

    const hoje = new Date();

    let diferenca = hoje.getFullYear() - dataFornecida.getFullYear();

    // Ajusta a diferença se o aniversário ainda não ocorreu neste ano
    if (
        hoje.getMonth() < dataFornecida.getMonth() ||
        (hoje.getMonth() === dataFornecida.getMonth() && hoje.getDate() < dataFornecida.getDate())
    ) {
        diferenca--;
    }

    return diferenca;
}

// Exemplo de uso:

const courses = {
    "Fluency Way Class - Adults": "Inglês/80/Em grupo",
    "Fluency Way Class - Teens": "Inglês/80/Em grupo",
    "Fluency Way Class - Online": "Inglês/80/Em grupo",
    "Fluency Way Class - Kids": "Inglês/80/Em grupo",
    "Fluency Way Class - Little Ones": "Inglês/80/Em grupo",
    "Fluency Way Class - Standard One": "Inglês/80/Em grupo",

    "Fluency Way X - One X": "Inglês/44/Individual",
    "Fluency Way X - Double X": "Inglês/88/Individual",
    "Fluency Way X - Triple X": "Inglês/132/Individual",
    "Fluency Way X - 4X": "Inglês/176/Individual",
    "Fluency Way X Plus - One X": "Inglês/44/Individual",
    "Fluency Way X Plus - Double X": "Inglês/88/Individual",
    "Fluency Way X Plus - Triple X": "Inglês/132/Individual",
    "Fluency Way X Plus - 4X": "Inglês/176/Individual",

    "El Español - En grupo - Turma": "Espanhol/80/Em grupo",
    "El Español - X1": "Espanhol/44/Individual",
    "El Español - X2": "Espanhol/88/Individual",
    "El Español - X3": "Espanhol/88/Individual",

    "Tecnologia - Office Essential": "Tecnologia/60/Em grupo",
}
async function GetPipelineStage(id) {
    try {
        const { data: { deal_pipeline } } = await axios.get(`https://crm.rdstation.com/api/v1/deal_stages/${id}?token=${process.env.RD_TOKEN}`)

        return deal_pipeline
    } catch (error) {
        console.log(error)
    }


}

export const gatheringDataForDatabase = async (deals) => {
    const data = []
    for (const deal of deals) {

        const { id, deal_custom_fields, user, name, deal_products: [service], deal_stage } = deal

        const { name: pipeName } = await GetPipelineStage(deal_stage.id)
        const CEP = await findYourValueForCustomFields('CEP', deal_custom_fields)


        const viaCepData = await getDataFromCep(CEP)

        const studentBorn = await findYourValueForCustomFields('Data de nascimento do aluno', deal_custom_fields)
        const studentAge = await calcularDiferencaAnos(studentBorn)


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

            const splited = pipeName.split(" ")
            const [Classe, Subclasse] = service.name.split(' - ');

            const code = await codeContractMaker(result["Vendedor"])

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
                Curso: courses[service.name] ? courses[service.name].split("/")[0] : "",
                Unidade: splited[splited.length - 1],
                "Nº do contrato": code,
                "Idade do Aluno": studentAge,
                "Tipo/ modalidade": courses[service.name] ? courses[service.name].split("/")[2] : "",
                "Carga horário do curso": courses[service.name] ? courses[service.name].split("/")[1] : "",
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
// NewSearchSync()

// const t = [

//     "Lauren Pimenta Mota",
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