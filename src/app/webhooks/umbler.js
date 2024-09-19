import prisma from "../../database/database.js"
import { CreateCommentOnTrello } from "../connection/externalConnections/trello.js"



class UmblerWebhook {

    async feedBack(req, res) {
        const { nome, telefone, relato, nota } = req.body

        let formatedNumber = telefone.slice(5, telefone.length)

        const search = await prisma.person.findFirst({
            where: {
                tel: {
                    contains: formatedNumber
                }
            }
        })


        if (!search) return res.status(400).json({ message: `${nome} não encontrado na base de dado` })

        const { name, unidade, professor, aluno } = search
        await CreateCommentOnTrello(name, unidade, `${aluno} realizou a pesquisa de satisfação da primeira aula, Professor: ${professor} , Nota: ${nota},Relato: "${relato}".`)


        return res.status(200).json({ name, unidade, professor, aluno })
    }

    async firstClassAppointment(req, res) {

        // a resposta se sim ou nao se a pessoa vai comparecer na primeira aula 
        // fazer o comentario no trello do parecer da pessoa

    }
}

export default new UmblerWebhook