import axios from 'axios';
import "dotenv/config";

import { bodyFilterCustomFields, bodyMakerForCustomFields } from '../../../config/customFieldFinder.js';
import prisma from '../../../database/database.js';
import { Historic } from "../../../database/historic/properties.js";
import { GetDocument } from '../../connection/externalConnections/autentique.js';
import { Funnels, getContactsWithId, winADeal } from '../../connection/externalConnections/rdStation.js';
import { CreateCommentOnTrello, StartCicleWhenNewRegisterIsCreated } from '../../connection/externalConnections/trello.js';
import { ScheduleBotMessages, SendGroupAlerts, SendSimpleWpp } from '../../connection/externalConnections/wpp.js';
import { gatheringDataForDatabase } from '../../connection/rdSearchSync.js';
const historic = new Historic()
class PostController {

    async funnels(req, res) {
        try {
            const data = await Funnels()

            const newData = data.map(d => {
                return {
                    value: d.id,
                    name: d.name,

                }
            })


            return res.status(200).json(newData)

        } catch (error) {
            console.log(error)
            return res.status(400).json(error)

        }

    }


    async getRecent(req, res) {
        const { unity } = req.params
        const { take, skip } = req.query

        const { deal_stages } = await Funnels(unity)

        const { id } = deal_stages.find(res =>
            res.name.toLowerCase() === "matrícula" ||
            res.name.toLowerCase() === "contratos a renovar")


        try {
            await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=1000&token=${process.env.RD_TOKEN}&deal_pipeline_id=${unity}&deal_stage_id=${id}&page=${skip}&limit=${take}`)
                .then(async (response) => {
                    const array = []

                    const { total, deals } = response.data

                    for (const index of deals) {
                        const body = await bodyFilterCustomFields(index)
                        array.push(body)
                    }


                    return res.status(200).json({
                        contracts: array,
                        total: total,
                    })
                })

        } catch (error) {

            console.log({
                where: '[getrecent]',
                error
            })

            return res.status(400).json(error)
        }
    }

    async returnContract(req, res) {
        const { id } = req.params


        const data = await getContactsWithId(id)

        try {

            const body = await bodyMakerForCustomFields(data)

            return res.status(200).json({
                contract: body,
            })


        } catch (error) {
            console.log(error)
            return res.status(400).json("Erro")
        }
    }


    async sender(req, res) {
        try {
            const { event: { data } } = req.body

            const { name, signatures, files } = await GetDocument(data.document)

            const [type, id] = name.split("+")

            if (type.includes("reciboMd")) {
                const ordersIds = id.split("_")

                ordersIds.forEach(async (element) => {

                    const founded = await prisma.orders.findFirst({
                        where: {
                            id: {
                                endsWith: element
                            }
                        }
                    })

                    if (!founded) return

                    await prisma.orders.update({
                        where: {
                            id: founded.id
                        },
                        data: {
                            signed: true,
                            logs: {
                                push: {
                                    date: new Date(),
                                    description: "Assinou o contrato",
                                    responsible: data.user.name
                                }
                            }
                        }
                    })


                    console.log("Assinado")

                });

                return res.status(201).json({ message: "link atribuido com sucesso" })
            }

            const create = async (data) => {

                const usersSigned = signatures.map(sign => {
                    return sign.link !== null && {
                        responsible: sign.user.name,
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
                        historic: {

                            create: usersSigned.filter(res => res !== false)

                        }
                    }
                })
                    .then(async (response) => {
                        await StartCicleWhenNewRegisterIsCreated(response)
                    })

                return register
            }

            const update = async (responsible, data) => {
                const register = await prisma.registers.update({
                    where: {
                        id: data.id
                    },
                    data: {
                        ...data,
                        assinaturaContratoStatus: "Ok",
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
                })

                return register
            }

            await prisma.registers.findFirst({
                where: {
                    id: id
                }
            })
                .then(async register => {
                    if (register) await update(data.user.name, register)

                    if (data.user.name === "Victor Souza") return res.status(200).send("ok")

                    const dealWin = await winADeal(id)

                    const [deal] = await gatheringDataForDatabase([dealWin])

                    const newUser = await create(deal)

                    const unityNumber = {
                        "Golfinho Azul": "31 8713-7018",
                        'PTB': "31 8713-7018",
                        'Centro': "31 8284-0590"
                    }

                    const curseMessages = {
                        "Inglês": `Hello, ${newUser.name}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar 
boas-vindas ao nosso curso de Inglês. 
Está pronto para deixar o verbo to be para trás? 🏃💨

Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho.
Se tiver alguma dúvida ou precisar de qualquer coisa, 
envie uma mensagem para o número pedagógico ${unityNumber[newUser.customFields["Unidade"]]} . 
I’ll see you in class`,

                        "Espanhol": `Hola, ${newUser.name}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de Espanhol. Está pronto para deixar o portunhol para trás? 🏃💨
Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho. 

Se tiver alguma dúvida ou precisar de qualquer coisa, 
envie uma mensagem para o número pedagógico ${unityNumber[newUser.customFields["Unidade"]]}.
Te veo en la clase 🇪🇸`,

                        "Tecnologia": `Hello, ${newUser.name}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de informática. Está pronto para aprender a montar documentos e planilhas completas? 😎
Em poucos meses você vai estar dominando o Pacote Office, e eu vou estar aqui para te ajudar em cada passo do caminho.

Se tiver alguma dúvida ou precisar de qualquer coisa,
envie uma mensagem para o número pedagógico ${unityNumber[newUser.customFields["Unidade"]]}.
Te esperamos na aula 👩‍💻`,
                    }


                    if (newUser.customFields['Background do Aluno'] !== "Rematrícula") {

                        await Promise.all([

                            ScheduleBotMessages(
                                newUser.name, newUser.customFields["Phone"],
                                newUser.customFields["Data da primeira aula"],
                                "Lembrete da primeira aula"),

                            SendSimpleWpp(
                                newUser.name,
                                newUser.customFields["Phone"],
                                curseMessages[newUser.customFields["Curso"]]),
                        ])


                    }

                    let chatAdm = newUser.customFields["Unidade"] === "Centro" ?
                        process.env.UMBLER_CHAT_PAYS_CENTRO :
                        process.env.UMBLER_CHAT_PAYS_PTB

                    let chatProf = newUser.customFields["Unidade"] === "Centro" ?
                        process.env.UMBLER_CHAT_REM_ID_CENTRO :
                        process.env.UMBLER_CHAT_REM_ID_PTB

                    const message = `> *${data.user.name}*

acabou de assinar o contrato de ${newUser.customFields['Background do Aluno']}`

                    await Promise.all([
                        CreateCommentOnTrello(
                            newUser.name,
                            newUser.customFields["Unidade"],
                            `${data.user.name} assinou contrato de ${newUser.
                                customFields['Background do Aluno']} via autentique no dia ${new Date().toLocaleDateString()}`),

                        SendGroupAlerts(message, chatAdm),
                        SendGroupAlerts(message, chatProf)
                    ])
                    return res.status(200).json({ message: "Success" })
                })

        } catch (error) {
            await SendSimpleWpp("marcos", process.env.MARCOS, JSON.stringify(`[SENDER:CONTRACTS]: ${error}`, null, 2))
            return res.status(200).json({ message: "Success" })

        }

    }

    async comissionData(req, res) {
        const { range, unity, dates } = req.query


        try {


            const [initial, final] = dates.split("~")

            const [result, count] = await prisma.$transaction([

                prisma.registers.findMany({
                    where: {
                        created_at: {
                            gte: new Date(initial),
                            lte: new Date(final)
                        }
                    },
                    orderBy: {
                        name: 'asc',
                    },
                }),
                prisma.registers.count({
                    where: {
                        created_at: {
                            gte: new Date(initial),
                            lte: new Date(final)
                        }
                    }
                })


            ])





            const selectedDbData = await Promise.all(result.map(async r => {

                const wichFunnel = (unity, background) => {

                    const funis = {
                        "PTB/matricula": "Funil de Vendas PTB",
                        "PTB/rematricula": "Funil de Rematrícula PTB",
                        "Centro/matricula": "Funil de Vendas Centro",
                        "Centro/rematricula": "Funil de Rematrículas Centro",
                    }

                    const type = background === "Rematrícula" ? "rematricula" : "matricula"
                    const funil = funis[unity + "/" + type];
                    return funil
                }
                return {
                    name: r.name,
                    aluno: r.customFields["Nome do aluno"],
                    curso: r.customFields["Curso"],
                    tipoMatricula: r["comissaoStatus"],
                    unidade: r.customFields["Unidade"],
                    dataMatricula: r.customFields["Data de emissão da venda"],
                    owner: r["owner"],
                    background: r.customFields["Background do Aluno"],
                    ppFormaPg: r.customFields["Forma de pagamento da parcela"],
                    funnel: await wichFunnel(r.customFields["Unidade"], r.customFields["Background do Aluno"])
                }
            }))


            return res.status(200).json({
                data: {
                    period: range,
                    total: count,
                    deals: selectedDbData
                }
            })



        } catch (error) {
            console.log(error)
            return res.status(400).json({ Erro: "Tente novamente mais tarde, se o erro persistir entre em contato com o suporte " })
        }
    }

}

export default new PostController()
