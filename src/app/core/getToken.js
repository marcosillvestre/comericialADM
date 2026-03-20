import axios from "axios";
import prisma from "../../database/database.js";
import 'dotenv/config';
import { SendSimpleWpp } from "../connection/externalConnections/wpp.js";

const encodedTest = Buffer.from(`${process.env.CONTA_AZUL_CLIENT_IDd}:${process.env.CONTA_AZUL_CLIENT_SECRETt}`, 'utf8').toString('base64');

const headerTest = {
    "Authorization": `Basic ${encodedTest}`,
    "content-Type": "application/x-www-form-urlencoded"
}

async function Run({ refresh_token }) {

    const body = {
        grant_type: 'refresh_token',
        refresh_token
    }

    try {

        const { data } = await axios.post(
            "https://auth.contaazul.com/oauth2/token",
            body,
            { headers: headerTest }
        )

        return data;

    } catch (error) {

        console.log({
            error: error.response,
            where: "[SWITCH GRANT_TYPE FOR ACCESS_CODE]",
        })

        await SendSimpleWpp("marcos", process.env.MARCOS,
            "O refresh token do conta azul expirou")

    }
}


export const getNewToken = async (unity) => {

    const id = unity === "PTB" ? 3 : 4;

    const { refresh_token } = await prisma.conec.findUnique({
        where: {
            id
        }
    })

    const refresh = await Run({ refresh_token });

    if (!refresh) return null;

    const { access_token: newToken, refresh_token: newRefresh } = refresh;

    await prisma.conec.update({
        where: {
            id
        },
        data: {
            refresh_token: newRefresh
        }
    })

    return newToken;
}

// async function getData() {
//     let unity = 'PTB'
//     const token = await getNewToken(unity)

//     const query = new URLSearchParams({
//         pagina: '1',
//         tamanho_pagina: '1',

//         // tipo_perfil: 'CLIENTE',
//         status: 'ATIVO',
//         ids: "a71f5c0f-7be8-445b-80c2-277688191389",
//         nome: "1001"
//     }).toString();

//     const resp = await fetch(
//         `https://api-v2.contaazul.com/v1/pessoa?${query}`,
//         {
//             method: 'GET',
//             headers: {
//                 Authorization: `Bearer ${token}`
//             }
//         }
//     );

//     const data = await resp.json();
//     const { itens } = data
//     console.log(data);
// }

// getData()





// const codeData = await axios.get(
//     `https://auth.contaazul.com/oauth2/authorize?response_type=code&client_id=${process.env.CONTA_AZUL_CLIENT_IDd}&redirect_uri=https://controlecomercial-git-stagetest-marcosillvestres-projects.vercel.app&state=ESTADO&scope=openid+profile+aws.cognito.signin.user.admin`
// )

// console.log(codeData.request)




// var headers = {
//     "Authorization": `Bearer ${await getToken("PTB")}`,
//     "Content-Type": "application/json"
// }
// await axios.get("https://api.contaazul.com/v1/products?code=PBKADULTS1&size=10000",
//     { headers: headers })
//     .then(res => {

//         console.log({
//             len: res.data.length,
//             res: res.data.filter(t => t.code.includes("PBK"))
//         })
//     })

// const d = await prisma.registers.create({
//     data: {
//         historic: {
//             createMany:
//         }
//     }
// })

// console.log(d.slice(0, 100))
