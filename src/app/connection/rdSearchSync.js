import "dotenv/config";
import prisma from '../../database/database.js';
import { getContactsWithId } from './externalConnections/rdStation.js';
import { StartCicleWhenNewRegisterIsCreated } from "./externalConnections/trello.js";

const comebackDays = 3
const options = { method: 'GET', headers: { accept: 'application/json' } };



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

export const gatheringDataForDatabase = async (deals) => {
    const data = []
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
        if (error.meta.target[0] === 'id') sucesso = null
        console.error("Erro ao armazenar registros");
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
            console.log(total)
            if (total > 0) await LoopForStoreNewRegisters(deals)
        })
}

export default NewSearchSync


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