import axios from "axios"
import prisma from "../../database/database.js"
import { getToken } from "../core/getToken.js"

async function SyncContaAzulAndDatabaseCentro() {
    const header = {
        "Authorization": `Bearer ${await getToken("Centro")}`
    }
    const sales = await axios.get("https://api.contaazul.com/v1/sales?size=1000", { headers: header })
    const json = sales.data.filter(res => res.payment.installments[0]?.status === "ACQUITTED")

    const filtered = json.filter(res => res.notes !== '')

    let notes = filtered.map(res => {
        let notes = res.notes
        let cleanData = notes.replace(/\\n/g, "")
        let note = JSON.parse(cleanData)


        return {
            aluno: note.Aluno,
            responsavel: note["Responsável"],
            contract: note.contrato,
            service: note.serviço,
            tm: note['TM Valor'],
            value: res.total,
        }
    })


    const routes = {
        "parcela": "ppStatus",
        "taxa de matricula": "tmStatus",
        "material didatico": "mdStatus"
    }


    notes.map(async response => {

        if (routes[response.service]) {
            try {
                await prisma.person.update({
                    where: { contrato: response.contract },
                    data: {
                        [routes[response.service]]: "Ok"
                    }
                }).then(() => console.log("Success"))

            } catch (error) {
                console.log(response.aluno)

            }
        }


    })




}
async function SyncContaAzulAndDatabasePtb() {
    const header = {
        "Authorization": `Bearer ${await getToken("PTB")}`
    }
    const sales = await axios.get("https://api.contaazul.com/v1/sales?size=1000", { headers: header })
    const json = sales.data.filter(res => res.payment.installments[0]?.status === "ACQUITTED")

    const filtered = json.filter(res => res.notes !== '')

    let notes = filtered.map(res => {
        let notes = res.notes
        let cleanData = notes.replace(/\\n/g, "")
        let note = JSON.parse(cleanData)


        return {
            aluno: note.Aluno,
            responsavel: note["Responsável"],
            contract: note.contrato,
            service: note.serviço,
            tm: note['TM Valor'],
            value: res.total,
        }
    })


    const routes = {
        "parcela": "ppStatus",
        "taxa de matricula": "tmStatus",
        "material didatico": "mdStatus"
    }


    notes.map(async response => {

        if (routes[response.service]) {
            try {
                await prisma.person.update({
                    where: { contrato: response.contract },
                    data: {
                        [routes[response.service]]: "Ok"
                    }
                }).then(() => console.log("Success"))

            } catch (error) {
                console.log(response.aluno)

            }
        }


    })




}


const syncContaAzul = async () => {
    await SyncContaAzulAndDatabaseCentro()
    await SyncContaAzulAndDatabasePtb()
}


export default syncContaAzul

