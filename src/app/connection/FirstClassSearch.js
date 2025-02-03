import { PastCodes } from "../../config/getLastMonday.js";
import prisma from "../../database/database.js";
import { SendNewClasses } from "./externalConnections/wpp.js";


const { getLastMondayCode } = new PastCodes()

const filter4Week = (array) => {
    let filtered = Promise.resolve(array.filter(res => {
        let initial = parseInt(res["Data da aula"].slice(0, 2))
        const date = new Date()
        let startDate = parseInt(getLastMondayCode(date).slice(0, 2))
        let endDate = startDate + 6

        return initial >= startDate && initial <= endDate && res
    }))


    return filtered

}

const databaseSearch = async (unity) => {
    const date = new Date()
    const month = date.getMonth() + 1
    const period = "/0" + month + "/" + date.getFullYear()

    const search = await prisma.registers.findMany({
        where: {
            customFields: {
                path: ["Data da primeira aula"],
                string_contains: period
            },
            customFields: {
                path: ["Unidade"],
                string_contains: unity
            },

        }
    })

    return search.map((res) => {
        return {
            "Data da aula": res.customFields["Data da primeira aula"],
            "Aluno": res.customFields["Nome do aluno"],
            "Responsável": res.name,
            "Classe": res.customFields["Classe"],
            "Horário": `${res.customFields[`Horário de Inicio`]} às ${res.customFields["Horário de fim"]}`,
            "Professor": res.customFields["Professor"],
            "Material didático": res.customFields["Material didático"],
            "Telefone": res.customFields["Phone"] || "Sem esse dado",
            "Responsável pela venda": res.customFields["Vendedor"],
        }
    })

}

async function SearchFirstClassWeek(unity) {

    const separated4Month = await databaseSearch(unity)
    let listByWeek = await filter4Week(separated4Month)

    return listByWeek
}


const firstClassSearch = async () => {
    console.log("Searching first classes")
    for (const unity of ["Centro", "PTB"]) {

        const list = await SearchFirstClassWeek(unity)
        await SendNewClasses(`Lista de novas matrículas na unidade: *${unity}*`, unity)
        let lists = [list[0]]
        for (const element of lists) {

            await SendNewClasses(
                JSON.stringify(element, null, 2).replace(/[{}]/g, ''),
                unity
            )
        }
    }
}



export default firstClassSearch
