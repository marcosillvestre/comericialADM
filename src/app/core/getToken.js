import axios from "axios";
import prisma from "../../database/database.js";


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
        const data = await axios.post("https://api.contaazul.com/oauth2/token",
            body, { headers: header })

        const { access_token } = data.data;

        await prisma.conec.update({
            where: { id: id },
            data: {
                access_token: data?.data.access_token,
                refresh_token: data?.data.refresh_token
            }
        })

        return access_token

    } catch (error) {
        console.log(error.response.data)
        // return error
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
