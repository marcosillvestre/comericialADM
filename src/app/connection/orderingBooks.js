import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from "path";
import { getLastMondayCode } from '../../config/getLastMonday.js';
import prisma from "../../database/database.js";

import 'dotenv';




async function SearchOrders(unity) {
    let code = await getLastMondayCode()

    const order = await prisma.orders.findFirst({
        where: {
            code,
            unity
        }
    })

    if (order?.orders.length > 0) SendMail(order?.orders, unity)
}


let destiny = {
    "PTB": process.env.EMAIL_CENTRO,
    "Centro": process.env.EMAIL_PTB
}


async function SendMail(data, unity) {

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_CLIENT,
                pass: process.env.TOKEN_GMAIL
            }
        })

        // this takes the email template 
        const handleOpt = {
            viewEngine: {
                extName: ".handlebars",
                partialsDir: path.resolve("./view"),
                defaultLayout: false,
            },
            viewPath: path.resolve("./view"),
            extName: ".handlebars"
        }


        transporter.use('compile', hbs(handleOpt))

        const mail = {
            from: `American Way ${process.env.GMAIL_CLIENT}`,
            to: destiny[unity],
            subject: `Pedido de livro - American Way`,
            template: 'emailTemplate',
            text_template: 'emailTemplate',
            context: {
                emailBody: data
            }
        }

        const sended = await transporter.sendMail(mail)

        if (sended.messageId) console.log("Pedido de livros enviado")

    } catch (error) {
        console.log(error)
    }
}

const orderBooks = async () => {
    console.log("Ordering books")
    for (const unity of ["Centro", "PTB"]) {
        await SearchOrders(unity)
    }
}



export default orderBooks