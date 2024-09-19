// import axios from "axios"
// import prisma from "../../../database/database.js"



// // const headers = {
// //     "Authorization": `Bearer ${await getToken("Centro", 'refresh')}`
// // }
// const getCustomerId = async (name) => {
//     const { data } = await axios.get(`https://api.contaazul.com/v1/customers?name=${name}`, { headers: headers })

//     return data[0]
// }

// const getSalesByCustomerId = async (name, what) => {
//     const customer = await getCustomerId(name)

//     if (!customer) return "Não encontrado"
//     const { id } = customer
//     const { data } = await axios.get(`https://api.contaazul.com/v1/sales?status=COMMITTED&customer_id=${id}`, { headers: headers })


//     const services = await Promise.all(data.map(async res => {
//         const status = res.payment.installments[0]?.status
//         let notes = res.notes
//         let cleanData = notes.replace(/\\n/g, "")

//         let parsed = () => {
//             try {
//                 return JSON.parse(cleanData)["serviço"]
//             } catch (error) {
//                 console.log(res.customer.name)
//                 return false
//             }
//         }

//         let service = await parsed()

//         return (notes !== '' && service === what) ? res : null
//     }))

//     let filtered = services.filter(res => res !== null)

//     return filtered

// }

// // const sale = await getSalesByCustomerId("Hilton Carlos Pulcena", "material didatico")

// // console.log(await sale[0]?.payment.installments)

// async function name(params) {

//     await prisma.person.findMany({
//         where: {
//             unidade: "Centro",
//             OR: [
//                 {
//                     mdStatus: {
//                         equals: 'Pendente',
//                     },
//                 },
//                 {
//                     ppStatus: {
//                         equals: 'Pendente',
//                     }
//                 },
//                 {
//                     tmStatus: {
//                         equals: 'Pendente',
//                     }
//                 },

//             ],
//         },
//         select: {
//             name: true,
//             dataMatricula: true,
//             mdStatus: true,
//             ppStatus: true,
//             tmStatus: true,
//             unidade: true
//         }
//     })
//         .then(async r => {

//             console.log(r.map(res => {
//                 return {

//                 }
//             }))
//         })

// }

// // .then(async res => {


// // })
// // .catch(res => console.log({ erro: res.response.data, token: res.response.config.header }))


// // })

// // .catch(r => console.log(r.data))

// //parei aqui, fazer a procura de tras pra frente pra poder ser mais acurado
