import cors from 'cors'
import express from 'express'
// import '../src/app/connection/engineSearch.js'
import '../src/app/core/cronManager.js'
import routes from './routes/routes.js'

class App {
    constructor() {
        this.app = express()
        this.app.use(cors())

        this.middlewares()
        this.routes()
    }


    middlewares() {
        this.app.use(express.json())
    }
    routes() {
        this.app.use(routes)
    }
}

export default new App().app


// 9,Sophia,sophia.americanway@gmail.com,$2b$10$At9ApTA94RXjsxu5iJlM0O5r7skd/gsyRSHQAMseDH8pvI7Jjb2Jm,f,comercial,{Centro}
// 7,Bernardo,bernardo.americanway@gmail.com,$2b$10$RHtP36HDZIVMFqvsR9adYuJHl0kQbvtf7sV9YkS8bK13762owxoeu,t,direcao,{Todas}
// 10,Valquiria,financeiro.americanway@gmail.com,$2b$10$LN25TlqkvGGegmsn21MARePEGRtQKIvMY8LIL7twjZv2JClGEIqka,t,administrativo,{Todas}
// 14,Aracelly,aracelly.americanway@gmail.com,$2b$10$CBJjLiuvvALUm/raVuI7iOyInznIUXt1gq0flFmySlhVXTz2ZSFU.,t,gerencia,{PTB,Centro}
// 1,Marcos,marcos.vinicius7170@gmail.com,$2b$10$RlRMJvRX/cuA.qIHrj1BAujNy4AOiQ3nlUH3FcmrKFnxI05Fb9NMq,t,direcao,{Todas}
// 5,Victor,victor.americanway@gmail.com,$2b$10$GXWrX/bQGJUpjBAKg2et2.34HrNUoN0MYc5tT1A1lOTNjsEGLZcV2,t,direcao,{Todas}