import { getLastMondayCode } from "../../config/getLastMonday.js";
import prisma from "../../database/database.js";
import { SendtoWpp } from "./externalConnections/wpp.js";



const filter4Week = (array) => {
    let filtered = Promise.resolve(array.filter(res => {
        let initial = parseInt(res["Data da aula"].slice(0, 2))

        let startDate = parseInt(getLastMondayCode().slice(0, 2))
        let endDate = startDate + 6

        return initial >= startDate && initial <= endDate && res
    }))


    return filtered

}

const databaseSearch = async (unity) => {
    const date = new Date()
    const period = "/0" + date.getMonth() + "/" + date.getFullYear()

    const search = await prisma.person.findMany({
        where: {
            paDATA: {
                contains: period
            },
            unidade: unity
        },
        select: {
            paDATA: true,
            horarioInicio: true,
            horarioFim: true,
            name: true,
            aluno: true,
            professor: true,
            tel: true,
            classe: true
        }
    })

    return search.map(res => {
        return {
            "Data da aula": res.paDATA,
            "Horário": `${res.horarioInicio} às ${res.horarioFim}`,
            "Responsável": res.name,
            "Aluno": res.aluno,
            "Professor": res.professor[0],
            "Telefone": res.tel,
            "Classe": res.classe,
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

        list.length > 0 ? await SendtoWpp(`Esses são os alunos que terão sua primeira aula esta semana na unidade do ${unity}: ${JSON.stringify(list, null, 2).replace(/\[|\]/g, '')}`, unity) :
            await SendtoWpp(`Não há aulas programadas para esta semana na unidade do ${unity}`, unity)
    }
}


export default firstClassSearch
