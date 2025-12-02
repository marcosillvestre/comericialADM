
import axios from 'axios';
import 'dotenv/config';
import FormData from 'form-data';
import fs from 'fs';
import { SendSimpleWpp } from '../../connection/externalConnections/wpp.js';
import { winADeal } from '../../connection/externalConnections/rdStation.js';
import { gatheringDataForDatabase } from '../../connection/rdSearchSync.js';
import { createRegisterWhenDocumentSigned } from '../../connection/externalConnections/autentique.js';
import prisma from '../../../database/database.js';
class AutentiqueController {
    async store(req, res) {
        const { name: nameCustomer, number } = req.body

        try {

            const { path, originalname } = req.file;

            // Ler o arquivo PDF como stream
            const fileStream = fs.createReadStream(path);

            // Criar um FormData para enviar o arquivo via GraphQL mutation
            const formData = new FormData();
            formData.append('operations', JSON.stringify({
                query: `
        mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {                          
        createDocument (document: $document, signers: $signers, file: $file ) {
            id
            name
            refusable
            sortable
            created_at
            signatures {
            public_id
            name
            email
            created_at
            action { name }
            link { short_link }
            user { id name email }
            }
        }
        }
            `,
                variables: {
                    "document": { "name": `${originalname.replace(".pdf", "").replace(/(\d+)(\s*\([^)]*\))?(\.[^\s]+)?$/g, '$1')}` },
                    "signers": [{ "name": `${nameCustomer}`, 'action': "SIGN" },
                    { "name": "Victor", 'action': "SIGN" },
                    ],
                    file: null,

                }
            }));
            formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
            formData.append('0', fileStream, originalname);

            var config = {
                method: 'post',
                url: 'https://api.autentique.com.br/v2/graphql',
                headers: {
                    'Authorization': `Bearer ${process.env.AUTENTIQUE_TOKEN}`,
                    ...formData.getHeaders()
                },
                data: formData
            };

            // return res.status(200).json({})

            await axios(config)
                .then(async function (response) {
                    const { signatures, name } = response.data.data.createDocument;

                    const customerLink = signatures[1].link.short_link
                    const school = signatures[2].link.short_link

                    Promise.all([
                        SendSimpleWpp(
                            name,
                            number,
                            `Olá *${nameCustomer}*, a American Way está te enviando um documento para assinatura neste link:
                            
${customerLink}

Qualquer problema você pode entrar em contato com seu consultor responsável
(para tornar o link clicável você pode salvar o número da American Way🗽).
`,
                            ['automação']
                        ),
                        SendSimpleWpp("Victor", `${process.env.VICTOR}`,
                            `🆕🆕🆕🆕🆕🆕🆕
                        Victor, novo contrato para você assinar em nome de *${name}* neste link:
                        ${school}`
                        ),

                    ])

                    const [_, id] = name.split("+");
                    const registerExists = await prisma.registers.findUnique({ where: { id } });

                    if (!registerExists) {
                        const dealWin = await winADeal(id);
                        const [deal] = await gatheringDataForDatabase([dealWin]);
                        await createRegisterWhenDocumentSigned(
                            deal, signatures, customerLink
                        );
                    }

                    return res.status(200).json({
                        message: {
                            "customer": customerLink
                        }
                    })
                })
                .catch(function (error) {
                    console.log(error);
                    return res.status(400).json({ error })

                })
                .finally(() => {
                    fs.unlink(path, (err) => {
                        if (err) throw err;
                        console.log('path was deleted');
                    })
                })

        } catch (error) {
            console.log("autentique error " + error)
            return res.status(400).json({ message: "Erro no arquivo" })
        }

    }

    async storeRecipe(req, res) {
        const { name, number } = req.body

        try {
            const path = req.file.path;

            // Ler o arquivo PDF como stream
            const fileStream = fs.createReadStream(pdfPath);

            // Criar um FormData para enviar o arquivo via GraphQL mutation
            const formData = new FormData();
            formData.append('operations', JSON.stringify({
                query: `
        mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {                          
        createDocument (document: $document, signers: $signers, file: $file ) {
            id
            name
            refusable
            sortable
            created_at
            signatures {
            public_id
            name
            email
            created_at
            action { name }
            link { short_link }
            user { id name email }
            }
        }
        }
            `,
                variables: {
                    "document": { "name": `${originalname.replace(".pdf", "").replace(/(\d+)(\s*\([^)]*\))?(\.[^\s]+)?$/g, '$1')}` },
                    "signers": [
                        { "name": `${name}`, 'action': "SIGN" },
                    ],
                    file: null,

                }
            }));
            formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
            formData.append('0', fileStream, originalname);

            var config = {
                method: 'post',
                url: 'https://api.autentique.com.br/v2/graphql',
                headers: {
                    'Authorization': `Bearer ${process.env.AUTENTIQUE_TOKEN}`,
                    ...formData.getHeaders()
                },
                data: formData
            };

            // return res.status(200).json({})

            await axios(config)
                .then(function (response) {

                    const { data: { data } } = response

                    const customerLink = data.createDocument.signatures[1].link.short_link

                    Promise.all([
                        SendSimpleWpp(
                            name,
                            number,
                            `Olá *${name}*, a American Way está te enviando um documento para assinatura neste link:
${customerLink}

Qualquer problema você pode entrar em contato com seu consultor responsável (para tornar o link clicável você pode salvar o número da American Way🗽).
                            `,
                            ['automação']
                        ),
                    ])

                    return res.status(200).json({
                        message: {
                            "customer": customerLink
                        }
                    })
                })
                .catch(function (error) {
                    console.log(error);
                    return res.status(400).json({ error })

                })
                .finally(() => {
                    fs.unlink(pdfPath, (err) => {
                        if (err) throw err;
                        console.log('path was deleted');
                    })
                })

        } catch (error) {
            console.log("autentique error " + error)
            return res.status(400).json({ message: "Erro no arquivo" })
        }

    }

}



export default new AutentiqueController()