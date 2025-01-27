import axios from 'axios';
import "dotenv/config";
import { funis } from "../../../utils/funnels.js";
import { stages } from "../../../utils/stage.js";

import { findYourValueForCustomFields } from '../../../config/customFieldFinder.js';
import { DateTransformer } from '../../../config/DateTransformer.js';
import prisma from '../../../database/database.js';
import { Historic } from "../../../database/historic/properties.js";
import { getContactsWithId } from '../../connection/externalConnections/rdStation.js';
import { CreateCommentOnTrello } from '../../connection/externalConnections/trello.js';
import { ScheduleBotMessages, SendSimpleWpp } from '../../connection/externalConnections/wpp.js';
const historic = new Historic()
class PostController {

    async getRecent(req, res) {
        const { unity } = req.params

        try {
            await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=1000&token=${process.env.RD_TOKEN}&deal_pipeline_id=${funis[unity]}&deal_stage_id=${stages[unity]}`)
                .then(response => {
                    const array = []
                    for (const index of response?.data?.deals) {
                        const deal = index.deal_custom_fields
                        const desPrimeirasParcelas = deal.filter(res => res.custom_field.label.includes('Valor do desconto primeiras parcelas')).map(res => res.value)[0]
                        const body = {
                            id: index.id,
                            name: deal.filter(res => res.custom_field.label.includes('Nome  do responsável')).map(res => res.value)[0],
                            contrato: deal.filter(res => res.custom_field.label.includes('Nº do contrato')).map(res => res.value)[0],
                            unidade: deal.filter(res => res.custom_field.label.includes('Unidade')).map(res => res.value)[0],
                            rg: deal.filter(res => res.custom_field.label.includes('RG responsável')).map(res => res.value)[0],
                            cpf: deal.filter(res => res.custom_field.label.includes('CPF')).map(res => res.value)[0],
                            DatadeNascdoResp: deal.filter(res => res.custom_field.label.includes('Data de nascimento do  responsável')).map(res => res.value)[0],
                            CelularResponsavel: index.contacts[0]?.phones[0]?.phone,
                            EnderecoResponsavel: deal.filter(res => res.custom_field.label.includes('Endereço')).map(res => res.value)[0],
                            NumeroEnderecoResponsavel: deal.filter(res => res.custom_field.label === 'Número').map(res => res.value)[0],
                            complemento: deal.filter(res => res.custom_field.label.includes('Complemento')).map(res => res.value)[0],
                            bairro: deal.filter(res => res.custom_field.label.includes('Bairro')).map(res => res.value)[0],
                            profissao: deal.filter(res => res.custom_field.label.includes('Profissão')).map(res => res.value)[0],
                            email: index.contacts[0]?.emails[0]?.email,
                            nomeAluno: deal.filter(res => res.custom_field.label.includes('Nome do aluno')).map(res => res.value)[0],
                            cargaHoraria: `${deal.filter(res => res.custom_field.label.includes('Carga horário do curso')).map(res => res.value)}`,
                            numeroParcelas: deal.filter(res => res.custom_field.label.includes('Número de parcelas')).map(res => res.value)[0],
                            descontoTotal: deal.filter(res => res.custom_field.label.includes('Desconto total')).map(res => res.value)[0],
                            descontoPorParcela: deal.filter(res => res.custom_field.label.includes('Valor do desconto de pontualidade por parcela')).map(res => res.value)[0],
                            curso: deal.filter(res => res.custom_field.label.includes('Curso')).map(res => res.value)[0],
                            valorCurso: index.deal_products[0]?.total,
                            dataUltimaParcelaMensalidade: deal.filter(res => res.custom_field.label.includes('Data de vencimento da última parcela')).map(res => res.value)[0],

                            acFormato: deal.filter(res => res.custom_field.label.includes('Tipo de assinatura')).map(res => res.value)[0],

                            vendedor: index.user.name,
                            dataMatricula: deal.filter(res => res.custom_field.label.includes('Data de emissão da venda')).map(res => res.value)[0],
                            cidade: deal.filter(res => res.custom_field.label.includes('Cidade')).map(res => res.value)[0],
                            estado: deal.filter(res => res.custom_field.label === 'UF').map(res => res.value)[0],
                            cep: deal.filter(res => res.custom_field.label.includes('CEP')).map(res => res.value)[0],
                            estadoCivil: deal.filter(res => res.custom_field.label === 'Estado civil responsável').map(res => res.value)[0],
                            nascimentoAluno: deal.filter(res => res.custom_field.label.includes('Data de nascimento do aluno')).map(res => res.value)[0],
                            formato: deal.filter(res => res.custom_field.label.includes('Formato de Aula')).map(res => res.value)[0],
                            tipoModalidade: deal.filter(res => res.custom_field.label.includes('Tipo de plano')).map(res => res.value)[0],
                            classe: deal.filter(res => res.custom_field.label.includes('Classe')).map(res => res.value)[0],
                            subclasse: deal.filter(res => res.custom_field.label.includes('Subclasse')).map(res => res.value)[0],
                            paDATA: deal.filter(res => res.custom_field.label.includes('Data da primeira aula')).map(res => res.value)[0],
                            valorMensalidade: deal.filter(res => res.custom_field.label.includes('Valor total da parcela')).map(res => res.value)[0],
                            diaVenvimento: deal.filter(res => res.custom_field.label.includes('Data de vencimento da primeira parcela')).map(res => res.value)[0],
                            dataPrimeiraParcelaMensalidade: deal.filter(res => res.custom_field.label.includes('Data de vencimento da primeira parcela')).map(res => res.value)[0],
                            valorParcela: deal.filter(res => res.custom_field.label.includes('Valor total da parcela')).map(res => res.value)[0],

                            ppFormaPg: deal.filter(res => res.custom_field.label.includes('Forma de pagamento da parcela')).map(res => res.value)[0],
                            ppVencimento: deal.filter(res => res.custom_field.label.includes('Data de vencimento da primeira parcela')).map(res => res.value)[0],
                            materialDidatico: deal.filter(res => res.custom_field.label.includes('Material didático')).map(res => res.value)[0],
                            mdValor: deal.filter(res => res.custom_field.label.includes('Valor total do material didático')).map(res => res.value)[0],
                            mdDesconto: deal.filter(res => res.custom_field.label.includes('Valor do desconto material didático')).map(res => res.value)[0],

                            mdFormaPg: deal.filter(res => res.custom_field.label.includes('Forma de pagamento do MD')).map(res => res.value)[0],
                            mdVencimento: deal.filter(res => res.custom_field.label.includes('Data de pagamento MD')).map(res => res.value)[0],
                            tmDesconto: deal.filter(res => res.custom_field.label.includes('Valor de desconto na taxa de matrícula')).map(res => res.value)[0],
                            tmFormaPg: deal.filter(res => res.custom_field.label.includes('Forma de pagamento TM')).map(res => res.value)[0],
                            tmVencimento: deal.filter(res => res.custom_field.label.includes('Data de pagamento TM')).map(res => res.value)[0],
                            service: index.deal_products[0]?.name ? index.deal_products[0]?.name : "",
                            observacaoRd: deal.filter(res => res.custom_field.label.includes('Observações importantes para o pedagógico')).map(res => res.value)[0],

                            parcelasAfetadas: deal.filter(res => res.custom_field.label.includes('Quantidade de primeiras parcelas com desconto')).map(res => res.value)[0],
                            descontoPrimeirasParcelas: desPrimeirasParcelas,
                            demaisParcelas: deal.filter(res => res.custom_field.label.includes('Quantidade de demais parcelas')).map(res => res.value)[0],
                            descontoDemaisParcelas: deal.filter(res => res.custom_field.label.includes('Valor do desconto demais parcelas')).map(res => res.value)[0],
                            promocao: desPrimeirasParcelas === undefined || desPrimeirasParcelas === "0" || desPrimeirasParcelas === "" ? "Não" : "Sim",
                            background: deal.filter(res => res.custom_field.label.includes('Background do Aluno')).map(res => res.value)[0],
                            obsFinanceiro: deal.filter(res => res.custom_field.label.includes('Observações importantes para o financeiro')).map(res => res.value)[0],
                            campanha: deal.filter(res => res.custom_field.label.includes('Tipo de Campanha / Convênio')).map(res => res.value)[0]
                        }
                        array.push(body)
                    }
                    return res.status(200).json(array)
                })

        } catch (error) {
            console.log(error)
        }
    }

    async sender(req, res) {
        const str = req.body

        const { partes, documento } = str

        if (documento.nome.includes("adesao")) {

            const [_, contract] = documento.nome.split("+")


            const f = partes.map(async res => {

                if (res.nome && contract) await historic._store(res.nome, "Contrato", "Assinado", contract)

                return {
                    nome: res.nome,
                    email: res.email,
                    cpf: res.cpf,
                    celular: res.celular,
                    assinado: res.assinado.created

                }
            })


            let founded = await f.find(res => res.nome !== "American Way")

            if (!founded) return res.status(200).json({ message: "Cliente não assinou ainda" })

            const { nome, cpf } = founded

            // const { key, value, tel, pAula, unidade, curso, background } = await getDealIdWithCPf(nome, cpf, contract)

            const { deal, phone } = getContactsWithId(contract)

            if (!deal) return res.status(200).json({ message: "Não encontrado" })

            const unityNumber = {
                "Golfinho Azul": "31 8713-7018",
                'PTB': "31 8713-7018",
                'Centro': "31 8284-0590"
            }

            const curseMessages = {
                "Inglês": `Hello, ${nome}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar 
boas-vindas ao nosso curso de Inglês. 
Está pronto para deixar o verbo to be para trás? 🏃💨

Sua jornada rumo à fluência está prestes a começar, 
e eu vou estar aqui para te ajudar em cada passo do caminho.
Se tiver alguma dúvida ou precisar de qualquer coisa,
envie uma mensagem para o número pedagógico ${unityNumber[unidade]} . 
I’ll see you in class`,
                "Espanhol": `Hola, ${nome}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de Espanhol. Está pronto para deixar o portunhol para trás? 🏃💨
Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho. Se tiver alguma dúvida ou precisar de qualquer coisa, 
envie uma mensagem para o número pedagógico ${unityNumber[unidade]}.
Te veo en la clase 🇪🇸`,
                "Tecnologia": `Hello, ${nome}. Tudo bem com você? 😊
Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de informática. Está pronto para aprender a montar documentos e planilhas completas? 😎
Em poucos meses você vai estar dominando o Pacote Office, e eu vou estar aqui para te ajudar em cada passo do caminho. Se tiver alguma dúvida ou precisar de qualquer coisa,
envie uma mensagem para o número pedagógico ${unityNumber[unidade]}.
Te esperamos na aula 👩‍💻`,
            }



            const { id, deal_custom_fields, name } = deal


            if (await findYourValueForCustomFields('Background do Aluno', deal_custom_fields) !== "Rematrícula") {


                await Promise.all([
                    ScheduleBotMessages(
                        name,
                        phone,
                        await findYourValueForCustomFields("Data da primeira aula"),
                        "Lembrete da primeira aula"),

                    SendSimpleWpp(nome, tel, curseMessages[curso]),
                    winADeal(id)
                ])

            }


            try {

                const update = async () => {
                    await prisma.registers.update({
                        where: {
                            id: id,
                            assinaturaContratoStatus: {
                                contains: "pendente",
                                mode: "insensitive"
                            }
                        },
                        data: {
                            assinaturaContratoStatus: "Ok",

                        }
                    })
                }


                await Promise.all([
                    update(),
                    CreateCommentOnTrello(
                        name,
                        await findYourValueForCustomFields("Unidade"),
                        `${name} assinou contrato via autentique no dia ${new Date().toLocaleDateString()}`),
                ])


            } catch (error) {
                console.log(error)
                console.log("Contrato não encontrado")
            }

            return res.status(200).json({ message: "deu certo" })
        }

        if (documento.nome.includes("reciboMd")) {
            const [nameTruncked, code] = documento.nome.split("+")

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

    }

    //     async sender(req, res) {
    //         const str = req.body

    //         const { partes, documento } = str

    //         if (documento.nome.includes("adesao")) {

    //             const [_, contract] = documento.nome.split("+")


    //             const f = partes.map(async res => {

    //                 if (res.nome && contract) await historic._store(res.nome, "Contrato", "Assinado", contract)

    //                 return {
    //                     nome: res.nome,
    //                     email: res.email,
    //                     cpf: res.cpf,
    //                     celular: res.celular,
    //                     assinado: res.assinado.created

    //                 }
    //             })


    //             let founded = await f.find(res => res.nome !== "American Way")

    //             if (!founded) return res.status(400).json({ message: "Cliente não assinou ainda" })

    //             const { nome, cpf } = founded

    //             const { key, value, tel, pAula, unidade, curso, background } = await getDealIdWithCPf(nome, cpf, contract)

    //             const unityNumber = {
    //                 "Golfinho Azul": "31 8713-7018",
    //                 'PTB': "31 8713-7018",
    //                 'Centro': "31 8284-0590"
    //             }

    //             const curseMessages = {
    //                 "Inglês": `Hello, ${nome}. Tudo bem com você? 😊
    // Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar 
    // boas-vindas ao nosso curso de Inglês. 
    // Está pronto para deixar o verbo to be para trás? 🏃💨

    // Sua jornada rumo à fluência está prestes a começar, 
    // e eu vou estar aqui para te ajudar em cada passo do caminho.
    // Se tiver alguma dúvida ou precisar de qualquer coisa,
    // envie uma mensagem para o número pedagógico ${unityNumber[unidade]} . 
    // I’ll see you in class`,
    //                 "Espanhol": `Hola, ${nome}. Tudo bem com você? 😊
    // Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de Espanhol. Está pronto para deixar o portunhol para trás? 🏃💨
    // Sua jornada rumo à fluência está prestes a começar, e eu vou estar aqui para te ajudar em cada passo do caminho. Se tiver alguma dúvida ou precisar de qualquer coisa, 
    // envie uma mensagem para o número pedagógico ${unityNumber[unidade]}.
    // Te veo en la clase 🇪🇸`,
    //                 "Tecnologia": `Hello, ${nome}. Tudo bem com você? 😊
    // Aqui é a Lúcia, consultora digital da American Way. Vim aqui para te desejar boas-vindas ao nosso curso de informática. Está pronto para aprender a montar documentos e planilhas completas? 😎
    // Em poucos meses você vai estar dominando o Pacote Office, e eu vou estar aqui para te ajudar em cada passo do caminho. Se tiver alguma dúvida ou precisar de qualquer coisa,
    // envie uma mensagem para o número pedagógico ${unityNumber[unidade]}.
    // Te esperamos na aula 👩‍💻`,
    //             }


    //             if (background !== "Rematrícula") {

    //                 await ScheduleBotMessages(nome, tel, pAula, "Lembrete da primeira aula")
    //                 await SendSimpleWpp(nome, tel, curseMessages[curso])

    //             }



    //             const contracts = await prisma.person.findFirst({
    //                 where: {
    //                     [key]: {
    //                         contains: value,
    //                         mode: "insensitive"
    //                     },
    //                     acStatus: "Pendente",
    //                 },
    //             })


    //             if (!contracts) {
    //                 console.log("Não encontrado no sistema ou já assinado")
    //                 return res.status(200).json({ message: "Não encontrado no sistema ou já assinado" })
    //             }


    //             try {
    //                 const { contrato, name, unidade } = contracts

    //                 const update = async () => {
    //                     await prisma.person.update({
    //                         where: { contrato: contrato },
    //                         data: {
    //                             dataAC: [{
    //                                 body1: {
    //                                     name1: f[0].nome,
    //                                     email1: f[0].email,
    //                                     signed1: f[0].assinado,
    //                                 },
    //                                 body2: {
    //                                     name2: f[1].nome,
    //                                     email2: f[1].email,
    //                                     signed2: f[1].assinado,
    //                                 }
    //                             }],
    //                             acStatus: "Ok"
    //                         }
    //                     })
    //                 }

    //                 await Promise.all([
    //                     update(),
    //                     CreateCommentOnTrello(name, unidade, `${name} assinou contrato via autentique no dia ${new Date().toLocaleDateString()}`),
    //                 ])


    //             } catch (error) {
    //                 console.log(error)
    //                 console.log("Contrato não encontrado")
    //             }

    //             return res.status(200).json({ message: "deu certo" })
    //         }

    //         if (documento.nome.includes("reciboMd")) {
    //             const [nameTruncked, code] = documento.nome.split("+")

    //             const [_, name] = nameTruncked.split("-")

    //             const ordersSigned = await prisma.books.findFirst({
    //                 where: {
    //                     nome: {
    //                         contains: name,
    //                         mode: "insensitive"
    //                     }
    //                 }
    //             })


    //             if (!ordersSigned) {
    //                 console.log("Contrato de recibo não encontrado")
    //                 return res.status(400).json({ message: "not found" })
    //             }

    //             const { id } = ordersSigned

    //             await prisma.books.update({
    //                 where: {
    //                     id
    //                 },
    //                 data: {
    //                     assinado: true
    //                 }
    //             })

    //             return res.status(201).json({ message: "link atribuido com sucesso" })
    //         }

    //     }

    async delete(req, res) {
        const { id } = req.params
        const { responsible } = req.query


        const deleteData = async () => {
            return new Promise(resolve => {
                resolve(
                    prisma.person.delete({ where: { contrato: id } })
                )
            })
        }

        const historic = async () => {
            return new Promise(resolve => {
                resolve(prisma.historic.create({
                    data: {
                        responsible: responsible,
                        information: {
                            field: "Contratos",
                            to: "Deletado",
                            from: id,
                        }
                    }
                })
                )
            })
        }

        await Promise.all([
            deleteData(),
            historic()
        ])
            .then(() => {
                return res.status(201).json({ message: "Deleted" })

            })
            .catch(() => {
                return res.status(400).json({ message: "Something went wrong" })
            })
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
