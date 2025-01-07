import axios from 'axios';
import "dotenv/config";
import prisma from '../../database/database.js';
import { CardCreationOnTrello } from './externalConnections/trello.js';
import { SendSimpleWpp, SendtoWpp } from './externalConnections/wpp.js';

const comebackDays = 2
const options = { method: 'GET', headers: { accept: 'application/json' } };

async function searchSync() {

    const backDay = new Date()
    backDay.setDate(backDay.getDate() - comebackDays)
    const startDate = backDay.toISOString()

    const currentDate = new Date()
    const endDate = currentDate.toISOString()
    let limit = 200

    await axios.get(`https://crm.rdstation.com/api/v1/deals?limit=${limit}&token=${process.env.RD_TOKEN}&win=true&closed_at_period=true&start_date=${startDate}&end_date=${endDate}`, options)
        .then(async response => {
            console.log(response.data.total)
            if (response.data.total > 0) {
                const array = []
                for (const index of response?.data?.deals) {

                    const body = {
                        name: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Nome  do responsável')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Nome  do responsável')).map(res => res.value)[0] : "Sem este dado no rd",
                        owner: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Vendedor')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Vendedor')).map(res => res.value)[0] : "Sem este dado no rd",

                        unidade: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Unidade')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Unidade')).map(res => res.value)[0] : "Sem este dado no rd",
                        background: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Background')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Background')).map(res => res.value)[0] : "Sem este dado no rd",
                        tipoMatricula: "Pendente",
                        tipoComissao: "Pendente",
                        comissaoValor: "Pendente",
                        diretorResponsavel: "Pendente",
                        Valor: index.amount_total ? index.amount_total : 0.0,
                        id: index.id,
                        situMatric: "Pendente",
                        paStatus: "Pendente",

                        responsavelADM: "Pendente",
                        aprovacaoADM: "Pendente",
                        aprovacaoDirecao: "Pendente",
                        contrato: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Nº do contrato')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Nº do contrato')).map(res => res.value)[0] : "Sem este dado no rd",
                        inicioContrato: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de início do contrato')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de início do contrato')).map(res => res.value)[0] : "Sem este dado no rd",
                        fimContrato: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de fim do contrato')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de fim do contrato')).map(res => res.value)[0] : "Sem este dado no rd",
                        acFormato: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Tipo de assinatura')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Tipo de assinatura')).map(res => res.value)[0] : "Sem este dado no rd",
                        acStatus: "Pendente",

                        tmValor: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor de taxa de matrícula')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor de taxa de matrícula')).map(res => res.value)[0] : "Sem este dado no rd",
                        tmFormaPg: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Forma de pagamento TM')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Forma de pagamento TM')).map(res => res.value)[0] : "Sem este dado no rd",
                        tmVencimento: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de pagamento TM')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de pagamento TM')).map(res => res.value)[0] : "Sem este dado no rd",

                        tmStatus: "Pendente",
                        ppVencimento: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de vencimento da primeira parcela')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de vencimento da primeira parcela')).map(res => res.value)[0] : "Sem este dado no rd",

                        mdValor: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor total do material didático')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor total do material didático')).map(res => res.value)[0] : "Sem este dado no rd",
                        aluno: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Nome do aluno')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Nome do aluno')).map(res => res.value)[0] : "Sem este dado no rd",
                        tel: index.contacts.map(res => res.phones).map(res => res[0]?.phone)[0] ? index.contacts.map(res => res.phones).map(res => res[0]?.phone)[0] : "Sem este dado no rd",
                        email: index.contacts.map(res => res.emails).map(res => res[0]?.email)[0] ? index.contacts.map(res => res.emails).map(res => res[0]?.email)[0] : "Sem este dado no rd",
                        paDATA: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data da primeira aula')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data da primeira aula')).map(res => res.value)[0] : "Sem este dado no rd",
                        classe: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Classe')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Classe')).map(res => res.value)[0] : "Sem este dado no rd",
                        subclasse: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Subclasse')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Subclasse')).map(res => res.value)[0] : "Sem este dado no rd",
                        ppStatus: "Pendente",

                        formatoAula: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Formato de Aula')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Formato de Aula')).map(res => res.value)[0] : "Sem este dado no rd",
                        tipoModalidade: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Tipo/ modalidade')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Tipo/ modalidade')).map(res => res.value)[0] : "Sem este dado no rd",
                        professor: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Professor')).map(res => res.value) ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Professor')).map(res => res.value) : "Sem este dado no rd",

                        horarioFim: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Horário de fim')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Horário de fim')).map(res => res.value)[0] : "Sem este dado no rd",
                        horarioInicio: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Horário de Inicio')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Horário de Inicio')).map(res => res.value)[0] : "Sem este dado no rd",

                        materialDidatico: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Material didático')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Material didático')).map(res => res.value)[0] : "Sem este dado no rd",
                        nivelamento: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Precisa de nivelamento?')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Precisa de nivelamento?')).map(res => res.value)[0] : "Sem este dado no rd",
                        diaAula: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Dia de aula')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Dia de aula')).map(res => res.value)[0] : "Sem este dado no rd",
                        alunoNascimento: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de nascimento do aluno')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de nascimento do aluno')).map(res => res.value)[0] : "Sem este dado no rd",
                        idadeAluno: `${index.deal_custom_fields.filter(res => res.custom_field.label.includes('Idade do Aluno')).map(res => res.value)}`,
                        tempoContrato: "",
                        dataMatricula: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de emissão da venda')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de emissão da venda')).map(res => res.value)[0] : "Sem este dado no rd",
                        observacao: [{ "obs": "", "name": "" }],
                        dataValidacao: "",
                        dataComissionamento: "",
                        contratoStatus: "Pendente",
                        cargaHoraria: `${index.deal_custom_fields.filter(res => res.custom_field.label.includes('Carga horário do curso')).map(res => res.value)}`,
                        tmDesconto: "",
                        tmParcelas: "",
                        tmData: "",
                        ppDesconto: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor do desconto de pontualidade por parcela')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor do desconto de pontualidade por parcela')).map(res => res.value)[0] : "Sem este dado no rd",
                        ppFormaPg: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Forma de pagamento da parcela')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Forma de pagamento da parcela')).map(res => res.value)[0] : "Sem este dado no rd",
                        ppParcelas: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Número de parcelas')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Número de parcelas')).map(res => res.value)[0] : "Sem este dado no rd",
                        ppData: "",
                        ppValor: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor total da parcela')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Valor total da parcela')).map(res => res.value)[0] : "Sem este dado no rd",
                        mdDesconto: "",

                        mdFormaPg: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Forma de pagamento do MD')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Forma de pagamento do MD')).map(res => res.value)[0] : "Sem este dado no rd",
                        mdVencimento: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de pagamento MD')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Data de pagamento MD')).map(res => res.value)[0] : "Sem este dado no rd",

                        mdParcelas: "",
                        mdData: "",
                        comissaoStatus: "Pendente",
                        curso: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Curso')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Curso')).map(res => res.value)[0] : "Sem este dado no rd",
                        obsPedagogico: index.deal_custom_fields.filter(res => res.custom_field.label.includes('Observações importantes para o pedagógico')).map(res => res.value)[0] ? index.deal_custom_fields.filter(res => res.custom_field.label.includes('Observações importantes para o pedagógico')).map(res => res.value)[0] : "Sem este dado no rd",

                    }
                    array.push(body)
                }
                if (array) {
                    array.map(async res => {



                        const signed = async () => {
                            const searchHistoric = await prisma.historic.findMany({
                                where: {
                                    OR: [
                                        {
                                            information: {
                                                equals: {
                                                    field: "Contrato",
                                                    to: "Assinado",
                                                    from: res.contrato
                                                }
                                            }
                                        },
                                        {
                                            responsible: {
                                                contains: res.name,
                                                mode: "insensitive"
                                            }
                                        }
                                    ]
                                }
                            })

                            if (searchHistoric.length > 0) {
                                const isThere = searchHistoric
                                    .find(sign => sign.responsible !== "American Way" || sign.responsible !== "Victor Souza")

                                return isThere ? "Ok" : "Pendente"
                            }
                            return "Pendente"
                        }


                        if (!(res.contrato.includes("/"))) {
                            await prisma.person.create({
                                data: {
                                    name: res.name,
                                    owner: res.owner,
                                    unidade: res.unidade,
                                    background: res.background,
                                    tipoMatricula: "Pendente",
                                    tipoComissao: "Pendente",
                                    comissaoValor: "Pendente",
                                    diretorResponsavel: "Pendente",
                                    Valor: res.Valor || 0.0,
                                    id: 1,
                                    situMatric: "Pendente",
                                    paStatus: "Pendente",

                                    responsavelADM: "Pendente",
                                    aprovacaoADM: "Pendente",
                                    aprovacaoDirecao: "Pendente",
                                    contrato: res.contrato,
                                    inicioContrato: res.inicioContrato,
                                    fimContrato: res.fimContrato,
                                    acFormato: res.acFormato,
                                    acStatus: await signed(),
                                    tmValor: res.tmValor,
                                    tmVencimento: res.tmVencimento,
                                    tmStatus: res.tmValor === 0 || res.tmValor === "" ? "Não" : "Pendente",
                                    ppVencimento: res.ppVencimento,
                                    mdValor: res.mdValor,
                                    mdStatus: res.curso === "Tecnologia" || res.mdValor === 0 || res.mdValor === "" ? "Não" : "Pendente",
                                    aluno: res.aluno,
                                    tel: res.tel,
                                    email: res.email,
                                    paDATA: res.paDATA,
                                    classe: res.classe,
                                    subclasse: res.subclasse,
                                    ppStatus: "Pendente",


                                    dataAC: [{ "data": "pendente" }],
                                    formatoAula: res.formatoAula,
                                    tipoModalidade: res.tipoModalidade,
                                    professor: res.professor,
                                    horarioFim: res.horarioFim,

                                    horarioInicio: res.horarioInicio,
                                    materialDidatico: res.materialDidatico,
                                    nivelamento: res.nivelamento,
                                    diaAula: res.diaAula,
                                    alunoNascimento: res.alunoNascimento,
                                    idadeAluno: `${res.idadeAluno}`,
                                    tempoContrato: "",
                                    dataMatricula: res.dataMatricula,
                                    observacao: [{ "obs": "", "name": "" }],
                                    dataValidacao: "",
                                    dataComissionamento: "",
                                    contratoStatus: "Pendente",
                                    cargaHoraria: `${res.cargaHoraria}`,
                                    tmDesconto: "",
                                    tmFormaPg: res.tmFormaPg,
                                    tmParcelas: "",
                                    tmData: "",
                                    ppDesconto: res.ppDesconto,
                                    ppFormaPg: res.ppFormaPg,
                                    ppParcelas: res.ppParcelas,
                                    ppData: "",
                                    ppValor: res.ppValor,
                                    mdDesconto: "",
                                    mdFormaPg: res.mdFormaPg,
                                    mdParcelas: "",
                                    mdData: "",
                                    mdVencimento: res.mdVencimento,
                                    curso: res.curso,
                                    comissaoStatus: "Pendente",
                                }
                            })
                                .then(async () => {
                                    console.log(`${res.name} foi cadastrado no sistema com sucesso`)
                                    await trelloCreateCard(res)
                                })
                                .catch((err) => {
                                    if (err.meta) {

                                        console.log(`${res.name} está com o contrato repetido : ${res.contrato}, ${res.dataMatricula}, ${res.unidade} `)
                                    }
                                    if (!err.meta) {
                                        console.log("Error : " + err)
                                    }
                                })
                        }
                        else {
                            console.log(`${res.name} está com o / no contrato : ${res.contrato}`)
                        }
                    })


                }
            }
        }
        )
}


export function addUsefullDays(data, diasUteis) {
    var dataAtual = new Date(data);
    var diasAdicionados = 0;

    while (diasAdicionados < diasUteis) {
        dataAtual.setDate(dataAtual.getDate() + 1);

        if (dataAtual.getDay() !== 0 && dataAtual.getDay() !== 6) {
            diasAdicionados++;
        }
    }

    return dataAtual;
}

async function trelloCreateCard(object) {
    let today = new Date();
    let futureDate = addUsefullDays(today, 7);

    const data = object

    const templates = {
        "Golfinho azul": process.env.PTB_TEMPLATE,
        'PTB': process.env.PTB_TEMPLATE,
        'Centro': process.env.CENTRO_TEMPLATE
    }

    const idList = {
        "Golfinho Azul": process.env.PTB_LIST,
        'PTB': process.env.PTB_LIST,
        'Centro': process.env.CENTRO_LIST
    }
    const description = {
        "background": data.background,
        "nome do aluno": data.aluno,
        "idade ": data.idadeAluno,
        "vendedor": data.owner,
        "responsável": data.professor,
        "whatsapp": data.tel,
        "Precisa de nivelamento": data.nivelamento,
        "Professor": data.professor,
        "Dia de aula": data.diaAula.map(res => res),
        "Dia da Primeira aula": data.paDATA,
        "Horario": `${data.horarioInicio}  às  ${data.horarioFim}`,
        "Caga Horaria do curso": data.cargaHoraria,
        "Curso": data.curso,
        "Classe": data.classe,
        "Sub Classe": data.subclasse,
        "Material": data.materialDidatico.map(res => res),
        "modalidade": data.tipoModalidade,
        "Formato das aulas": data.formatoAula,
        "anotações": data.observacao.map(res => res.value),
        "Valor do material": data.mdValor,
        "Vaor da taxa de matricula": data.tmValor,
        "Valor da mensalidade": data.ppValor,
    }


    const body = {
        name: data.name,
        desc: JSON.stringify(description, null, 2).replace("{", "").replace("}", ""),
        pos: 'bottom',
        due: futureDate,
        start: today,
        idList: idList[data.unidade],
        idCardSource: templates[data.unidade]
    }


    await CardCreationOnTrello(body)
        .then(async url => {
            let message = `> *${body.name}*

Foi cadastrado no sistema de comissão, voce pode encontra-lo também no trello por esse link: ${url}`

            await SendtoWpp(message, data.unidade)


            let conference = `> *${body.name}* 
                
Foi cadastrado no sistema de comissão.
                `

            await SendSimpleWpp("Carolina", process.env.CAROLINA, conference)

        })
}


export default searchSync







async function UpdateTheCustomFields() {
    fetch(`https://crm.rdstation.com/api/v1/custom_fields?token=${process.env.RD_TOKEN}&for=deal`, options)
        .then(response => response.json())
        .then(res => {
            console.log(res.length)
            res.map(async (r, i) => {
                await prisma.customFields.upsert({
                    where: {
                        id: r.id,
                    },
                    create: {
                        id: r.id,
                        name: r.label,
                        type: r.type,
                        options: r.opts,
                        order: i,
                        required: r.required
                    },
                    update: {
                        name: r.label,
                        type: r.type,
                        options: r.opts,
                        order: i,
                        required: r.required
                    }

                })
            })
        })
}


async function NewSearchSync() {

    await UpdateTheCustomFields()

    const backDay = new Date()
    backDay.setDate(backDay.getDate() - comebackDays)
    const startDate = backDay.toISOString()

    const currentDate = new Date()
    const endDate = currentDate.toISOString()
    let limit = 200

    fetch(`https://crm.rdstation.com/api/v1/deals?limit=${limit}&token=${process.env.RD_TOKEN}&win=true&closed_at_period=true&start_date=${startDate}&end_date=${endDate}`, options)
        .then(response => response.json())
        .then(async response => {
            const { total, deals } = response
            console.log(total)
            if (total > 0) {

                // const dealsssss = [deals[0]]
                for (const deal of deals) {

                    const { id, deal_custom_fields } = deal

                    const customFields = async () => {
                        const cf = await prisma.customFields.findMany()
                        const result = {}

                        for (let index = 0; index < cf.length; index++) {
                            const element = cf[index];
                            const { name } = element;

                            result[name] = deal_custom_fields
                                .filter(res => res.custom_field.label.includes(name))
                                .map(res => res.value)[0]
                        }

                        return await result

                    }

                    // console.log(await customFields())

                    const json = await customFields()

                    await prisma.registers.create({
                        data: {
                            id,
                            name: json['Nome  do responsável'],
                            owner: json['Vendedor'],
                            customFields: json
                        }
                    }).catch(err => console.log(err.meta))
                }
            }
        })
    // .catch(err => console.log(err))
}
// NewSearchSync()


async function UpdateForRegisters(SearchWhere, SearchWhat, UpdateWhere, UpdateWhat) {

    try {

        const register = await prisma.registers.findFirst({
            where: {
                [SearchWhere]: SearchWhat
            }
        })

        if (!register) throw new Error("Not found")

        const { id, customFields } = register

        customFields[UpdateWhere] = UpdateWhat


        // console.log(customFields)

        await prisma.registers.update({
            where: {
                id
            },
            data: {
                customFields
            }
        })

    } catch (error) {
        console.log(error)
    }
}

// let where = "name"
// let what = "Catia da Silva Romao"
// let updWhere = "UF"
// let updWhat = "Bocaiuva"

// k(where, what, updWhere, updWhat)

// const initial = "2024-11-01T00:00:00.000Z"
// const final = "2024-11-30T23:59:59.999Z"

// const take = 5
// const skipParsed = 0

// const [result, count] = await prisma.$transaction([

//     prisma.registers.findMany({
//         where: {
//             created_at: {
//                 gte: initial,
//                 lte: final
//             }
//         },
//         include: {
//             historic: true
//         },
//         orderBy: {
//             created_at: 'desc'
//         },
//         take,
//         skip: skipParsed,
//     }),

//     prisma.registers.count({
//         where: {
//             created_at: {
//                 gte: initial,
//                 lte: final
//             }
//         },
//     })

// ])

// console.log(result, count)
// console.log(new Date("pt-Br"))