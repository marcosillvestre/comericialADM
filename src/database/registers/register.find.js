import prisma from "../database.js";
export class RegisterFinder {

    async registerFinder(id, where, what) {
        const response = await prisma.registers.findFirst({
            where: {
                id,
                ...where
            }
        })

        return response

    }

    async registerFindMany(where, config) {
        const response = await prisma.registers.findMany({
            ...config,
            where: {
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