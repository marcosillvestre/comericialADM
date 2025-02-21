import prisma from "../database";


export class RegisterFinder {
    constructor() {

    }
    async registerFinder(where, what) {

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