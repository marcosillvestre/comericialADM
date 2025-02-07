import axios from 'axios';
import "dotenv/config";
import { updateStageRd } from './externalConnections/rdStation.js';

const funis = {
    "Centro": "64badc42874ccc000dd4ed2e",
    "PTB": "64bacb30693f48000d576869",
}
const stages = {
    "Centro": "64badc42874ccc000dd4ed34",
    "PTB": "64bacb30693f48000d57686a",
}


let page = 1

async function updateRdData(unity, page) {

    await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=200&page=${page}&token=${process.env.RD_TOKEN}&deal_pipeline_id=${funis[unity]}&deal_stage_id=${stages[unity]}`)
        .then(async response => {
            const { deals, has_more } = response.data

            let array = []
            for (const data of deals) {
                let index = data.deal_custom_fields.findIndex(item => item.custom_field.label === "Data de fim do contrato")
                let filtered = { value: data.deal_custom_fields[index].value, id: data.id, name: data.name }

                filtered.value !== null && array.push(filtered)
            }

            const date = new Date()
            date.setMonth(date.getMonth() + 2)
            const postMonth = date.toLocaleDateString()
            let splitedDate = postMonth.split("/")
            let monthAndYear = `${splitedDate[1]}/${splitedDate[2]}`

            console.log(array.length + " [CONTRACTS ACTIVES]")

            for (let i = 0; i < array.length; i++) {
                const value = array[i].value.split("/")
                const newValue = `${value[1]}/${value[2]}`

                if (newValue === monthAndYear) {
                    console.log(array[i].name + " [NEED  TO BE UPDATED]")
                    await updateStageRd(array[i], unity)
                }
            }

            if (has_more) {
                page += 1
                await updateRdData(unity, page)
            }
        })
        .catch(err => console.log(err))
}




const renewContracts = async () => {
    console.log("[RENEW]")
    for (const unity of ["Centro", "PTB"]) {
        await updateRdData(unity, page)
    }
}

export default renewContracts

// const t = [
//     { name: "Fluency Way Class - Adults", sku: "FWAC12TR", price: 200.80 },
//     { name: "Fluency Way Class - Teens", sku: "FWCT12TR", price: 189.60 },
//     { name: "Fluency Way Class - Online", sku: "FWCO12TR", price: 150.40 },
//     { name: "Fluency Way Class - Kids", sku: "FWCK12TR", price: 189.6 },
//     { name: "Fluency Way Class - Little Ones", sku: "FWCL12TR", price: 189.60 },
//     { name: "Fluency Way Class - Standard One", sku: "FWCS12TR", price: 200.80 },
//     { name: "Fluency Way X - One X", sku: "FWOX12PL", price: 261.60 },
//     { name: "Fluency Way X - Double X", sku: "FWDX12PL", price: 440.80 },
//     { name: "Fluency Way X - Triple X", sku: "FWTX12PL", price: 608.00 },
//     { name: "Fluency Way X - 4X", sku: "FW4X12PL", price: 744.8 },
//     { name: "Fluency Way X Plus - One X", sku: "FWPO12PL", price: 31.40 },
//     { name: "Fluency Way X Plus - Double X", sku: "FWPD12PL", price: 528.80 },
//     { name: "Fluency Way X Plus - Triple X", sku: "FWPT12PL", price: 729.60 },
//     { name: "Fluency Way X Plus - 4X", sku: "FWP412PL", price: 893.6 },
//     { name: "El Español - En grupo - Turma", sku: "EPET12TR", price: 177.60 },
//     { name: "El Español - X1", sku: "EPX112PL", price: 261.60 },
//     { name: "El Español - X2", sku: "EPX212PL", price: 395.20 },
//     { name: "El Español - X3", sku: "EPX312PL", price: 547.20 },
//     { name: "Tecnologia - Office Essential", sku: "TOET08TR", price: 165.20 },
// ]

// t.map(async res => {
//     const { name, price, sku } = res

//     const increseTax = Math.ceil(price * 0.25 + price)
//     const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
//     const descreaseThird = Math.floor(increseTax - increseTax * 0.3)
//     const decreaseFifteen = Math.floor(increseTax - increseTax * 0.15)

//     await prisma.services.create({
//         data: {
//             category: "Service",
//             sku,
//             name,
//             price_selling: price,
//             price_ticket: increseTax,
//             price_card: descreaseTw,
//             price_cash: descreaseThird,
//             price_link: decreaseFifteen,
//             color: "#dddd"
//         }
//     }).then(() => console.log("first"))
// })