import axios from "axios"
import prisma from "../../database/database.js"
import { getToken } from "../core/getToken.js"





const routes = {
    "parcela": "ppStatus",
    "taxa de matricula": "tmStatus",
    "material didatico": "mdStatus"
}


async function SyncContaAzulAndDatabase(header) {
    const sales = await axios.get("https://api.contaazul.com/v1/sales?size=1000", { headers: header })

    const json = sales.data.filter(res => res.payment.installments[0]?.status === "ACQUITTED")

    const filtered = json.filter(res => res.notes !== '')

    let notes = filtered.map(res => {
        let notes = res.notes
        let cleanData = notes.replace(/\\n/g, "")

        let note = !(notes.includes("(")) && JSON.parse(cleanData)

        return {
            aluno: note.Aluno,
            responsavel: note["Responsável"],
            contract: note.contrato,
            service: note.serviço,
            tm: note['TM Valor'],
            value: res.total,
            unidade: note.Unidade
        }

    })

    for (const response of notes) {
        if (response !== undefined) {
            let where = response.service !== undefined ? routes[response.service] : null
            if (where) {
                await prisma.person.findMany({
                    where: {
                        AND: [
                            {
                                contrato: {
                                    contains: response.contract,
                                },
                            },
                            {
                                [where]: {
                                    contains: "Pendente",
                                },
                            },
                        ],
                    },
                })
                    .then(async data => {
                        if (data.length > 0) {
                            try {
                                await prisma.person.update({
                                    where: { contrato: data[0].contrato },
                                    data: {
                                        [where]: "Ok"
                                    }
                                })
                                    .then(() => {
                                        console.log(`${response.aluno} success updated / ${where} / ${response.unidade}`)

                                    })
                                    .catch(e => console.log(e))

                            } catch (error) {
                                console.log(error)

                            }
                        }
                    })


            }
        }
    }
}



let unities = ["Centro", "PTB"]

const syncContaAzul = async () => {
    for (const realToken of unities) {
        const header = {
            "Authorization": `Bearer ${await getToken(realToken)}`
        }
        await SyncContaAzulAndDatabase(header)
    }
}


export default syncContaAzul


