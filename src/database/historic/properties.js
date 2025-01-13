import prisma from "../database.js"

export class Historic {

    _store(responsible, field, text, id) {

        try {
            return new Promise(resolve => {
                resolve(

                    prisma.logHistoric.create({
                        data: {
                            responsible: responsible,
                            information: {
                                field: field,
                                text: text,
                                from: id,
                            },
                            register: {
                                connect: {
                                    id: id
                                }
                            }
                        }

                    })
                )
            })

        } catch (error) {
            console.log(error)
        }
    }


}




