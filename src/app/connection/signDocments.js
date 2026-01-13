import prisma from "../../database/database.js";
import { GetDocumentsByName } from "./externalConnections/autentique.js";
import { getContactsWithId, winADeal } from "./externalConnections/rdStation.js";
import { SendGroupAlerts, SendSimpleWpp } from "./externalConnections/wpp.js";

const getData = async () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const data = await prisma.registers.findMany({
        include: {
            files: true,
            historic: true
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
                        not: "Ok",
                    }
                }

            ]

        }
    })

    return data;
}


async function ChargeSignDocuments() {
    const data = await getData();
    if (data.length === 0) return console.log("No documents to process");

    console.log(data.length)

    try {

        let toSendAdm = '*Contratos pendentes de assinatura*: \n';
        for (let index = 0; index < data.length; index++) {
            const { name, id, files, customFields, historic, assinaturaContratoStatus } = data[index];
            const filekey = files.find(f => f.key.includes("assina.ae"));

            const messageCustomer =
                `A sua matrícula não foi validada em nosso sistema. 

Por favor, certifique-se se já foi assinado o contrato para que a sua proposta não expire ou seja cancelada.

Segue o link: ${filekey?.key ?? "erro ao gerar o link, entre em contato com seu consultor comercial."}

Caso já tenha assinado, desconsidere essa mensagem.`;

            const contactData = await getContactsWithId(id);
            if (!contactData) continue;

            const { phone } = contactData;
            await SendSimpleWpp(name, phone, messageCustomer, ['automação'])

            const documentData = await GetDocumentsByName(name)
            if (!documentData) continue;

            const { signatures } = documentData;

            let noAuto = signatures.filter(sign => sign.signed !== null);

            const messageAdm =
                `Contrato n°: ${index + 1}
*responsavel*: ${customFields['Nome do responsável']}
*aluno*: ${customFields['Nome do aluno'] || name} 

*Assinaturas*: ---------------------
${noAuto.length > 0 ?
                    noAuto.map(t => t.name && `\n ${t.name} ✔`) :
                    "Ninguém assinou ainda"}


*Link para assinatura do cliente*: 

${filekey?.key ?? "erro ao gerar o link"}  

-----------------------------------
`

            toSendAdm += ("\n" + messageAdm)
        }

        await SendGroupAlerts(toSendAdm, process.env.UMBLER_COMERCIAL)

    } catch (error) {

        console.log({
            error,
            where: "[ charge sign document ]"
        });
    }
}

export default ChargeSignDocuments;