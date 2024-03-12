import axios from "axios"
import { getToken } from "../core/getToken.js"

async function SyncContaAzulAndDatabase() {
    const header = {
        "Authorization": `Bearer ${await getToken("Centro")}`
    }
    const sales = await axios.get("https://api.contaazul.com/v1/sales?size=1000", { headers: header })
    const json = sales.data.filter(res => res.payment.installments[0]?.status === "ACQUITTED")

    const filtered = json.filter(res => res.notes !== '')

    // console.log(JSON.stringify(filtered, null, 2))
    let notes = filtered.map(res => {
        let notes = res.notes
        let cleanData = notes.replace(/\\n/g, "")
        let note = JSON.parse(cleanData)

        // console.log(note)

        if (notes !== undefined && note.contrato !== undefined) {
            return {
                aluno: note.Aluno,
                responsavel: note["Responsável"],
                contract: note.contrato,
                service: note.serviço,
                tm: note['TM Valor'],
                value: res.total,
            }
        }

    })

    console.log(notes)
}

// SyncContaAzulAndDatabase()

export default SyncContaAzulAndDatabase

