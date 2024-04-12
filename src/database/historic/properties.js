import prisma from "../database.js"

export class Historic {

    _store(responsible, field, to, id) {
        let data = {
            responsible: responsible,
            information: {
                field: field,
                to: to,
                from: id,

            }
        }
        try {
            return new Promise(resolve => {
                resolve(prisma.historic.create({
                    data: data
                })
                )
            })

        } catch (error) {
            console.log(error)
        }
    }


}




