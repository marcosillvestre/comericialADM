import { DateTransformer } from "../../config/DateTransformer.js";
import { PastCodes } from "../../config/getLastMonday.js";
import prisma from "../../database/database.js";
import { CreateCommentOnTrello } from "./externalConnections/trello.js";
import { SendGroupAlerts } from "./externalConnections/wpp.js";


const { getLastMondayCode } = new PastCodes()

const filterForPeriod = async (array, period) => {

    const dates = new Date().setUTCHours(0, 0, 0, 0)
    let startDate = new Date(dates)
    const periodAhead = new Date().setDate(startDate.getDate() + period)
    let endDate = new Date(periodAhead).setUTCHours(0, 0, 0, 0)


    const data = [];

    for (let index = 0; index < array.length; index++) {
        const element = array[index];

        if (!element["Data da aula"]) continue

        const newDate = await DateTransformer(element["Data da aula"])

        if (newDate >= startDate && newDate <= endDate) data.push(element)
    }

    console.log({
        period,
        length: data.length
    })
    return data
}

const databaseSearch = async (unity) => {
    const date = new Date()
    const month = date.getMonth() + 1
    const period = "/0" + month + "/" + date.getFullYear()


    const search = await prisma.registers.findMany({
        where: {
            AND: [
                {
                    customFields: {
                        path: ["Unidade"],
                        equals: unity
                    },
                },
                {
                    customFields: {
                        path: ["Data da primeira aula"],
                        string_contains: period
                    },
                }
            ]

        }
    })


    console.log(`[MONTHLY REGISTERS: ${search.length}]`)

    return search.map((res) => {
        return {
            "Data da aula": res.customFields["Data da primeira aula"],
            "Responsável": res.name,
            text: `🆕🆕🆕🆕🆕🆕🆕🆕🆕🆕🆕🆕

> Aluno: *${res.customFields["Nome do aluno"]}* 

Data da aula: ${res.customFields[`Data da primeira aula`]}

Unidade: ${res.customFields["Unidade"]}

Responsável: ${res.name}

Classe: ${res.customFields["Classe"]}

Horário: ${`${res.customFields[`Horário de Inicio`]} às ${res.customFields["Horário de fim"]}`}

Professor: ${res.customFields["Professor"]}

Material didático: ${res.customFields["Material didático"]}

Telefone: ${res.customFields["Phone"] || "Sem esse dado"}

Responsável pela venda: ${res.customFields["Vendedor"]}`

        }
    })

}

async function SearchFirstClassWeek(unity) {

    const separated4Month = await databaseSearch(unity)
    let listByWeek = await filterForPeriod(separated4Month, 7)

    return listByWeek
}

async function SearchFirstClassForTomorrow(unity) {

    const separated4Month = await databaseSearch(unity)

    let listByWeek = await filterForPeriod(separated4Month, 2)

    return listByWeek
}

export const firstClassSearch = async () => {
    console.log("[SEARCHING FIRST CLASSES: WEEKLY]")

    for (const unity of ["Centro", "PTB"]) {
        let chat = unity === "Centro" ? process.env.UMBLER_TEACHER_CENTRO : process.env.UMBLER_TEACHER_PTB

        const list = await SearchFirstClassWeek(unity)

        if (list.length === 0) {
            await SendGroupAlerts(`*Sem registro de novos alunos até o momento*`,
                chat
            )
            continue
        }

        await SendGroupAlerts(`Lista de novos alunos na unidade: *${unity}*`,
            chat
        )
        for (const element of list) {

            await SendGroupAlerts(
                JSON.stringify(element, null, 2).replace(/[{}]/g, ''),
                chat
            )
        }
    }
}

export const firstClassDaily = async () => {
    console.log("[SEARCHING FIRST CLASSES: DAILY]")

    for (const unity of ["PTB"]) {
        let chat = unity === "Centro" ?
            process.env.UMBLER_TEACHER_CENTRO : process.env.UMBLER_TEACHER_PTB

        const list = await SearchFirstClassForTomorrow(unity)
        const date = new Date()

        if (list.length === 0) {
            await SendGroupAlerts(`*Sem registro de novos alunos até o momento*`,
                chat
            )

            continue
        }

        await SendGroupAlerts(`Lista de alunos que terão sua primeira aula entre ${date.toLocaleDateString('pt-Br')} e ${new Date(date.setDate(date.getDate() + 2)).toLocaleDateString('pt-Br')} na unidade: *${unity}*`,
            chat
        )

        for (const element of list) {

            await Promise.all([
                SendGroupAlerts(
                    element.text,
                    chat
                ),
                CreateCommentOnTrello(
                    element["Responsável"],
                    unity,
                    `Este aluno terá sua primeria aula hoje.
                Verifique o horário, avise o professor e prepare o material didático, se houver.`
                )])
        }
    }
}
