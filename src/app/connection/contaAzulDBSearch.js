import axios from "axios";
import "dotenv/config";
import prisma from '../../database/database.js';


const encoded = (Buffer.from(`${process.env.CONTA_AZUL_CLIENT_ID}:${process.env.CONTA_AZUL_CLIENT_SECRET}`).toString('base64'));


const header = {
    "Authorization": `Basic ${encoded}`,
    "Content-Type": "application/json"
}

async function refreshToken(id, token) {
    const body = {
        "grant_type": "refresh_token",
        "refresh_token": `${token}`
    }

    try {
        await axios.post("https://api.contaazul.com/oauth2/token",
            body, { headers: header }).then(async data => {
                console.log(`token ${id} atualizado`)

                await prisma.conec.update({
                    where: { id: id },
                    data: {
                        access_token: data?.data.access_token,
                        refresh_token: data?.data.refresh_token
                    }
                })
            })

    } catch (error) {
        console.log(error.response.data)
    }
}


async function token() {
    await prisma.conec.findMany()
        .then(async res => {
            for (const realToken of res) {
                await refreshToken(realToken.id, realToken.refresh_token)
            }
        })
}
//this 👆👆 part saves on a database the access and refresh_token

export default token
