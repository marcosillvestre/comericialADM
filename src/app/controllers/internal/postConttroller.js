import axios from 'axios';
import "dotenv/config";
import { funis } from "../../../utils/funnels.js";
import { stages } from "../../../utils/stage.js";

import { bodyMakerForCustomFields } from '../../../config/customFieldFinder.js';
import { DateTransformer } from '../../../config/DateTransformer.js';
import prisma from '../../../database/database.js';
import { Historic } from "../../../database/historic/properties.js";
import { GetDocument } from '../../connection/externalConnections/autentique.js';
import { winADeal } from '../../connection/externalConnections/rdStation.js';
import { CreateCommentOnTrello, StartCicleWhenNewRegisterIsCreated } from '../../connection/externalConnections/trello.js';
import { ScheduleBotMessages, SendSimpleWpp } from '../../connection/externalConnections/wpp.js';
import { gatheringDataForDatabase } from '../../connection/rdSearchSync.js';
const historic = new Historic()
class PostController {

    async getRecent(req, res) {
        const { unity } = req.params
        const { take, skip } = req.query

        try {
            await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=1000&token=${process.env.RD_TOKEN}&deal_pipeline_id=${funis[unity]}&deal_stage_id=${stages[unity]}&page=${skip}&limit=${take}`)
                .then(async (response) => {
                    const array = []
                    for (const index of response?.data?.deals) {
                        const body = await bodyMakerForCustomFields(index)
                        array.push(body)
                    }


                    return res.status(200).json({
                        total: response.data.total,
                        contracts: array
                    })
                })

        } catch (error) {
            console.log(error)
        }
    }

    async sender(req, res) {
        const { event: { data } } = req.body
        try {

            const { name, signatures, files } = await GetDocument(data.document)


            const [type, id] = name.split("+")

            if (type.includes("reciboMd")) {
                const [nameTruncked, code] = name.split("+")
                const [_, name] = nameTruncked.split("-")

                const ordersSigned = await prisma.books.findFirst({
                    where: {
                        nome: {
                            contains: name,
                            mode: "insensitive"
                        }
                    }
                })


                if (!ordersSigned) {
                    console.log("Contrato de recibo não encontrado")
                    return res.status(400).json({ message: "not found" })
                }

                const { id } = ordersSigned

                await prisma.books.update({
                    where: {
                        id
                    },
                    data: {
                        assinado: true
                    }
                })

                return res.status(201).json({ message: "link atribuido com sucesso" })
            }


            const dealWin = await winADeal(id)

            const [deal] = await gatheringDataForDatabase([dealWin])


            const create = async (responsible, data) => {
                await prisma.registers.create({
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
                    .then(async (response) => {
                        await StartCicleWhenNewRegisterIsCreated(response)
                    })
            }

            const update = async (responsible, data) => {
                await prisma.registers.update({
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
            }

            await prisma.registers.findUnique({
                where: {
                    id: deal.id
                }
            }).then(async register => {
                if (!register) return await create(data.user.name, deal)

                await Promise.all([
                    update(data.user.name, deal),
                    StartCicleWhenNewRegisterIsCreated(register)
                ])

                const unityNumber = {
                    "Golfinho Azul": "31 8713-7018",
                    'PTB': "31 8713-7018",
                    'Centro': "31 8284-0590"
                }

                const curseMessages = {
                    "Inglês": `Hello, ${register.name}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar 
boas-vindas ao nosso curso de Inglês. 
Está pronto para deixar o verbo to be para trás? 🏃💨

Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho.
Se tiver alguma dúvida ou precisar de qualquer coisa, 
envie uma mensagem para o número pedagógico ${unityNumber[register.customFields["Unidade"]]} . 
I’ll see you in class`,

                    "Espanhol": `Hola, ${register.name}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de Espanhol. Está pronto para deixar o portunhol para trás? 🏃💨
Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho. 

Se tiver alguma dúvida ou precisar de qualquer coisa, 
envie uma mensagem para o número pedagógico ${unityNumber[register.customFields["Unidade"]]}.
Te veo en la clase 🇪🇸`,

                    "Tecnologia": `Hello, ${register.name}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de informática. Está pronto para aprender a montar documentos e planilhas completas? 😎
Em poucos meses você vai estar dominando o Pacote Office, e eu vou estar aqui para te ajudar em cada passo do caminho.

Se tiver alguma dúvida ou precisar de qualquer coisa,
envie uma mensagem para o número pedagógico ${unityNumber[register.customFields["Unidade"]]}.
Te esperamos na aula 👩‍💻`,
                }


                if (register.customFields['Background do Aluno'] !== "Rematrícula") {

                    await Promise.all([
                        ScheduleBotMessages(
                            register.name, register.customFields["Phone"],
                            register.customFields["Data da primeira aula"],
                            "Lembrete da primeira aula"),
                        SendSimpleWpp(register.name, register.customFields["Phone"], curseMessages[register.customFields["Curso"]]),
                    ])

                    await CreateCommentOnTrello(
                        register.name,
                        register.customFields["Unidade"],
                        `${data.user.name} assinou contrato via autentique no dia ${new Date().toLocaleDateString()}`)

                }

                return res.status(200).json({ message: "Success" })
            })

        } catch (error) {
            console.log(error)
            await SendSimpleWpp("marcos", process.env.MARCOS, JSON.stringify(`erro : ${error}`, null, 2))
        }

    }




    async indexPeriod(req, res) {
        const { range, role, name, unity, dates, skip, take } = req.query

        const skipParsed = parseInt(skip)

        const [initial, final] = dates.split("~")

        try {
            const dbData = await prisma.person.findMany()
            const endData = take !== 'all' ? parseInt(take) : dbData.length


            const filtered = role === 'comercial' ?
                dbData.filter(res => res.owner.toLowerCase().includes(name.toLowerCase())) :
                dbData

            const initialDate = new Date(initial).setUTCHours(0, 0, 0, 0)
            const finalDate = new Date(final).setUTCHours(0, 0, 0, 0)


            const DateFilter = await Promise.all(filtered.map(async r => {
                let date = await DateTransformer(r.dataMatricula)

                return (date >= initialDate && date <= finalDate) ? r : null;

            }))

            let generalMonthsBefore = DateFilter.filter(res => res !== null)


            const slicedData = generalMonthsBefore.slice(skipParsed, endData + skipParsed)

            return res.status(200).json({
                period: range,
                total: generalMonthsBefore.length,
                deals: slicedData
            })



        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: "Erro" })

        }

    }

    async updateMany(req, res) {
        const { contracts, where, value, responsible } = req.body

        new Promise(resolve => {
            contracts.map(data => {
                resolve(
                    prisma.person.update(
                        {
                            where: {
                                contrato: data
                            },
                            data: {
                                [where]: value
                            }

                        }).then(async () => {
                            await prisma.historic.create({
                                data: {
                                    responsible: responsible.name,
                                    information: {
                                        field: where,
                                        to: value,
                                        from: data,
                                    }
                                }
                            })
                        }
                        )
                )
            })
        })


        return res.status(200).json({ message: "Success" })

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
