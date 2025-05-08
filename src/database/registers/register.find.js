import prisma from "../database.js";


export class RegisterFinder {

    async registerFinder(id, where, what) {
        const response = await prisma.registers.findUnique({
            where: {
                id,
                ...where
            }
        })

        return response

    }

    async registerFinderForCustomFields(where, what) {
        const response = await prisma.registers.findMany({
            where: {
                customFields: {
                    path: [where],
                    string_contains: what
                }
            }
        })

        return response
    }

}