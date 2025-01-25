import prisma from "../database.js"

export class Historic {

    _storeLog(responsible, field, text, id) {

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




