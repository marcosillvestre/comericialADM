import axios from "axios";
import 'dotenv/config';
import FormData from 'form-data';
import prisma from "../../../database/database.js";
import { StartCicleWhenNewRegisterIsCreated } from "./trello.js";


export const GetDocument = async (params) => {
    try {
        const formData = new FormData();
        formData.append('operations', JSON.stringify({
            query: `
            fragment event on Event {
        ip
        port
        reason
        created_at
        geolocation {
            country
            countryISO
            state
            stateISO
            city
            zipcode
            latitude
            longitude
        }
    }

    query ($id: UUID!) {
        document(id: $id) {
            id
            name
            refusable
            sortable
            created_at
            files { original signed pades }
            signatures {
                public_id
                name
                email
                created_at
                action { name }
                link { short_link } 
                user { id name email phone }
                user_data { name email phone } 
                email_events {
                    sent 
                    opened 
                    delivered 
                    refused 
                    reason 
                }
                viewed { ...event } 
                signed { ...event } 
                rejected { ...event } 
                signed_unapproved { ...event } 
                biometric_approved { ...event } 
                biometric_rejected { ...event } 
            }
        }
    }`,
            variables: {
                "id": params,
            }
        }));
        formData.append('map', JSON.stringify({ '0': ['variables.file'] }));

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

        const { data: { data } } = await axios(config)
        return data.document

    } catch (error) {
        console.log(error)
    }

}

export const createRegisterWhenDocumentSigned = async (data, signatures, link) => {

    const usersSigned = signatures.map(sign => {
        return sign.link !== null && {
            responsible: sign?.user?.name ?? sign?.name,
            information: {
                field: "assinaturaContratoStatus",
                text: "O status do contrato foi alterado para assinado",
                from: data.id,
            }
        }
    })

    const register = await prisma.registers.create({
        data: {
            ...data,
            assinaturaContratoStatus: "Ok",
            files: {
                create: {
                    contentType: "link",
                    key: link,
                    name: "Link do documento assinado"
                }
            },
            historic: {
                createMany: {
                    data: [
                        {
                            responsible: "Automação",
                            information: {
                                field: "created_at",
                                text: "Dia de criação do registro",
                                from: "1",
                            }
                        },
                        ...usersSigned.filter(res => res !== false)
                    ]
                }
            }
        }
    })

    await StartCicleWhenNewRegisterIsCreated(register)
    return register
}

export const updateRegisterWhenDocumentSigned = async (data, responsible, link) => {
    const imutable = {
        ...data,
        assinaturaContratoStatus: "Ok",
        files: {
            create: {
                contentType: "link",
                key: link,
                name: "Link do documento assinado"
            }
        },
        historic: {
            create: {
                responsible: responsible,
                information: {
                    field: "assinaturaContratoStatus",
                    text: `O status do contrato foi alterado para assinado`,
                    from: data.id,
                }
            }
        }
    }

    const validated = {
        ...imutable,
        comissaoStatus: "Pré-aprovado"
    }


    const validating =
        data.pagamentoPrimeiraParcelaStatus === 'Ok' &&
        data.taxaMatriculaStatus === 'Ok'


    const register = await prisma.registers.update({
        where: {
            id: data.id
        },
        data: validating ?
            validated :
            imutable

    })

    return register
}
