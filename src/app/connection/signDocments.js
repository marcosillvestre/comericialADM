import prisma from "../../database/database.js";
import { getContactsWithId, winADeal } from "./externalConnections/rdStation.js";
import { SendSimpleWpp } from "./externalConnections/wpp.js";

const getData = async () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const data = await prisma.registers.findMany({
        include: {
            files: true
        },
        where: {
            AND: [

                {
                    created_at: {
                        gte: new Date(sevenDaysAgo.setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                },
                {
                    assinaturaContratoStatus: {
                        not: "Ok"
                    }
                }

            ]

        }
    })

    return data;
}


async function ChargeSignDocuments() {
    const data = await getData();

    if (data.length === 0) return "No documents to process"

    try {
        for (let index = 0; index < data.length; index++) {
            const { name, id, files } = data[index];
            const { phone } = await getContactsWithId(id);

            if (!phone) continue;

            const filekey = files.find(f => f.key.includes("autentiue.com.br"));
            const message = `Olá, tudo bem? Aqui é da American Way. Estamos finalizando o seu cadastro e para isso precisamos que você assine o contrato. Por favor, verifique seu e-mail e siga as instruções para completar a assinatura. Qualquer dúvida, estamos à disposição! 
                
${filekey?.key ?? '*erro ao gerar link do documento entre em contato com seu gerente comercial*.'}`;

            await SendSimpleWpp(
                name,
                phone,
                message,
                ['automação']
            )


        }
    } catch (error) {

        console.log({
            error,
            where: "[ charge sign document ]"
        });
    }
}


export default ChargeSignDocuments;