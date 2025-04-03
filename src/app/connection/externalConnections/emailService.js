
import 'dotenv'
import nodemailer from 'nodemailer'

export async function SendMail({ to, subject, text }) {
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
        const mail = {
            from: `American Way ${process.env.GMAIL_CLIENT}`,
            to,
            subject,
            text

        }

        const sended = await transporter.sendMail(mail)

        if (sended.messageId) console.log('enviado com sucesso')

    } catch (error) {
        console.log({
            where: "[SENDINGMAILS]",
            error,
        })

    }
}