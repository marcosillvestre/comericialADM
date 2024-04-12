import prisma from "../../database/database.js";

export const getToken = async (unity) => {

    const token = await prisma.conec.findUnique({
        where: {
            id: unity === "Centro" ? 1 : 2
        }
    })

    return token.access_token
}


