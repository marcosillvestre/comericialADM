import axios from "axios";
import prisma from "../../database/database.js";


const encoded = Buffer.from(`${process.env.CONTA_AZUL_CLIENT_ID}:${process.env.CONTA_AZUL_CLIENT_SECRET}`).toString('base64');
const encodedTest = Buffer.from(`${process.env.CONTA_AZUL_CLIENT_IDd}:${process.env.CONTA_AZUL_CLIENT_SECRETt}`).toString('base64');

const header = {
    "authorization": `Basic ${encoded}`,
    "content-Type": "application/x-www-form-urlencoded"
}
const headerTest = {
    "authorization": `Basic ${encodedTest}`,
    "content-Type": "application/x-www-form-urlencoded"
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function refreshToken(id, token) {
    const body = {
        "grant_type": "refresh_token",
        "refresh_token": `${token}`
    }

    try {
        const data = await axios.post("https://api.contaazul.com/oauth2/token",
            body, { headers: header })

        const { access_token, refresh_token } = data.data;


        await prisma.conec.update({
            where: { id: id },
            data: {
                access_token,
                refresh_token
            }
        })



        return access_token

    } catch (error) {
        console.log(error.response.data)
        return error
    }
}



export const getToken = async (unity, action) => {

    const { id, refresh_token, access_token } =
        await prisma.conec.findUnique({
            where: {
                id: unity === "Centro" ? 1 : 2
            }
        })

    if (action === 'refresh') {
        const refreshed = await refreshToken(id, refresh_token)
        return refreshed
    }

    return access_token
}

// const codeData = await axios.get(
//     `https://auth.contaazul.com/oauth2/authorize?response_type=code&client_id=${process.env.CONTA_AZUL_CLIENT_IDd}&redirect_uri=https://controlecomercial-git-stagetest-marcosillvestres-projects.vercel.app&state=ESTADO&scope=openid+profile+aws.cognito.signin.user.admin`
// )

// console.log(codeData)

// return;

async function Run({ code, refresh_token }) {

    const body = {
        client_id: process.env.CONTA_AZUL_CLIENT_IDd,
        client_secret: process.env.CONTA_AZUL_CLIENT_SECRETt,
        grant_type: 'refresh_token',
        code,
        refresh_token
    }

    const { data } = await axios.post(
        "https://auth.contaazul.com/oauth2/token", body, { headers: headerTest }

    )
    const { access_token } = data;

    return access_token
}

async function getData() {

    const token = await getNewToken("PTB")

    const query = new URLSearchParams({
        pagina: '1',
        tamanho_pagina: '10',

        tipo_perfil: 'FORNECEDOR',
        status: 'ATIVO'
    }).toString();

    const resp = await fetch(
        `https://api-v2.contaazul.com/v1/pessoa?${query}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await resp.json();
    const { itens } = data
    console.log(data);
}

export const getNewToken = async (unity) => {

    const { refresh_token, access_token } =
        await prisma.conec.findUnique({
            where: {
                id: unity === "PTB" ? 3 : 4
            }
        })

    const refresh = await Run({
        code: access_token,
        refresh_token
    });

    return refresh;
}


// getData()









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
