
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { SendSimpleWpp } from '../connection/externalConnections/wpp.js';

class AutentiqueController {
    async store(req, res) {
        const { name, number } = req.body

        const pdfPath = req.file.path;

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
                "document": { "name": `adesao_${name}` },
                "signers": [{ "name": `${name}`, 'action': "SIGN" },
                { "name": "Victor", 'action': "SIGN" },
                ],
                file: null,

            }
        }));
        formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
        formData.append('0', fileStream, req.file.originalname);

        var config = {
            method: 'post',
            url: 'https://api.autentique.com.br/v2/graphql',
            headers: {
                'Authorization': 'Bearer c3e63c22a3b7fe2ffe753d8f338a76495e62b69eb76c5c0acbc55e287d605199',
                ...formData.getHeaders()
            },
            data: formData
        };

        // console.log(req.file)
        // return res.status(200).json({})

        await axios(config)
            .then(function (response) {
                const customerLink = response.data.data.createDocument.signatures[1].link.short_link
                // const school = response.data.data.createDocument.signatures[2].link.short_link

                SendSimpleWpp(number, `Olá ${name}, a American Way está te enviando um contrato nesse link: ${customerLink}`)
                    // SendSimpleWpp("+5531989103911", `Victor, a American Way está te enviando um contrato em nome de ${name} nesse link: ${school}`)
                    ;
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



    }
}
export default new AutentiqueController()