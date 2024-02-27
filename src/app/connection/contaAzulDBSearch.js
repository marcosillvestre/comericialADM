import axios from "axios";
import "dotenv/config";
import prisma from '../../database/database.js';


const encoded = (Buffer.from(`${process.env.CONTA_AZUL_CLIENT_ID}:${process.env.CONTA_AZUL_CLIENT_SECRET}`).toString('base64'));


const headers = {
    "Authorization": `Basic ${encoded}`,
    "Content-Type": "application/json"
}

async function token() {
    await prisma.conec.findMany().then(res => {
        refreshCentro(res.filter(data => data.id === 1))
        refreshPtb(res.filter(data => data.id === 2))
    })
}


async function refreshCentro(token) {
    const body = {
        "grant_type": "refresh_token",
        "refresh_token": `${token[0]?.refresh_token}`
    }

    try {
        await axios.post("https://api.contaazul.com/oauth2/token",
            body, { headers }).then(async data => {
                console.log("token 1 atualizado")
                await prisma.conec.update({
                    where: { id: 1 },
                    data: {
                        access_token: data?.data.access_token,
                        refresh_token: data?.data.refresh_token
                    }
                })
            })

    } catch (error) {
        console.log(error)
    }
}

async function refreshPtb(token) {
    const body = {
        "grant_type": "refresh_token",
        "refresh_token": `${token[0]?.refresh_token}`
    }

    try {
        await axios.post("https://api.contaazul.com/oauth2/token",
            body, { headers }).then(async data => {
                console.log("token 2 atualizado")
                await prisma.conec.update({
                    where: { id: 2 },
                    data: {
                        access_token: data?.data.access_token,
                        refresh_token: data?.data.refresh_token
                    }
                })
            })

    } catch (error) {
        console.log(error)

    }
}
//this 👆👆 part saves on a database the access and refresh_token


export default token
