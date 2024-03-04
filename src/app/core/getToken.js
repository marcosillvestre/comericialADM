import prisma from "../../database/database.js";

export const getToken = async (unity) => {

    const token = await prisma.conec.findMany({
        where: {
            id: unity.includes("PTB") ||
                unity.includes("Golfinho Azul") ? 2 : 1
        }
    })

    return token[0].access_token
}


