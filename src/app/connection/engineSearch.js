import axios from 'axios';
import "dotenv/config";
import prisma from '../../database/database.js';
import { CardCreationOnTrello } from './externalConnections/trello.js';
import { SendSimpleWpp, SendtoWpp } from './externalConnections/wpp.js';

const comebackDays = 5
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
                                        console.log(err)
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

    const { name, unidade, background } = object

    const templates = {
        "Golfinho azul/Novo aluno": process.env.PTB_TEMPLATE,
        'PTB/Novo aluno': process.env.PTB_TEMPLATE,
        'Centro/Novo aluno': process.env.CENTRO_TEMPLATE,

        "Golfinho azul/Ex-aluno": process.env.PTB_TEMPLATE,
        'PTB/Ex-aluno': process.env.PTB_TEMPLATE,
        'Centro/Ex-aluno': process.env.CENTRO_TEMPLATE,

        "Golfinho azul/Aluno vigente": process.env.PTB_TEMPLATE,
        'PTB/Aluno vigente': process.env.PTB_TEMPLATE,
        'Centro/Aluno vigente': process.env.CENTRO_TEMPLATE,

        "Golfinho azul/Rematrícula": process.env.PTB_TEMPLATE_REM,
        'PTB/Rematrícula': process.env.PTB_TEMPLATE_REM,
        'Centro/Rematrícula': process.env.CENTRO_TEMPLATE_REM
    }

    const idList = {
        "Golfinho Azul/Novo aluno": process.env.PTB_LIST,
        'PTB/Novo aluno': process.env.PTB_LIST,
        'Centro/Novo aluno': process.env.CENTRO_LIST,

        "Golfinho Azul/Ex-aluno": process.env.PTB_LIST,
        'PTB/Ex-aluno': process.env.PTB_LIST,
        'Centro/Ex-aluno': process.env.CENTRO_LIST,

        "Golfinho Azul/Aluno vigente": process.env.PTB_LIST,
        'PTB/Aluno vigente': process.env.PTB_LIST,
        'Centro/Aluno vigente': process.env.CENTRO_LIST,

        "Golfinho Azul/Rematrícula": process.env.PTB_LIST_REM,
        'PTB/Rematrícula': process.env.PTB_LIST_REM,
        'Centro/Rematrícula': process.env.CENTRO_LIST_REM

    }
    const description = {
        "background": object.background,
        "nome do aluno": object.aluno,
        "idade ": object.idadeAluno,
        "vendedor": object.owner,
        "responsável": object.professor,
        "whatsapp": object.tel,
        "Precisa de nivelamento": object.nivelamento,
        "Professor": object.professor,
        "Dia de aula": object.diaAula.map(res => res),
        "Dia da Primeira aula": object.paDATA,
        "Horario": `${object.horarioInicio}  às  ${object.horarioFim}`,
        "Caga Horaria do curso": object.cargaHoraria,
        "Curso": object.curso,
        "Classe": object.classe,
        "Sub Classe": object.subclasse,
        "Material": object.materialDidatico.map(res => res),
        "modalidade": object.tipoModalidade,
        "Formato das aulas": object.formatoAula,
        "anotações": object.observacao.map(res => res.value),
        "Valor do material": object.mdValor,
        "Vaor da taxa de matricula": object.tmValor,
        "Valor da mensalidade": object.ppValor,
    }


    const body = {
        name: name,
        desc: JSON.stringify(description, null, 2).replace("{", "").replace("}", ""),
        pos: 'bottom',
        due: futureDate,
        start: today,
        idList: idList[unidade.concat("/").concat(background)],
        idCardSource: templates[unidade.concat("/").concat(background)]
    }


    await CardCreationOnTrello(body)
        .then(async url => {
            let message = `> *${body.name}*

Foi cadastrado no sistema de comissão, voce pode encontra-lo também no trello por esse link: ${url}`

            await SendtoWpp(message, unidade)


            let conference = `> *${body.name}* 
                
Foi cadastrado no sistema de comissão.
                `

            await SendSimpleWpp("Carolina", process.env.CAROLINA, conference)

        })
}

export default searchSync



async function deletadorDeLivrosDuplicados(params) {

    await prisma.books.findMany()
        .then(res => {
            res.map(async r => {
                await prisma.books.findFirst({
                    where: {
                        id: {
                            not: r.id
                        },
                        aluno: r.aluno,
                        materialDidatico: r.materialDidatico,
                        nome: r.nome
                    }
                })
                    .then(async find => {
                        // console.log(find)
                        if (find) {

                            await prisma.books.delete({
                                where: {
                                    id: find.id
                                }
                            })
                                .then(() => console.log("deletado"))
                                .then((err) => console.log(err))

                        }
                    })



            })
        })
}
// deletadorDeLivrosDuplicados()

async function deletadorDeInsumosDuplicados(params) {

    await prisma.insume.findMany()
        .then(res => {
            res.map(async r => {
                await prisma.insume.findFirst({
                    where: {
                        id: {
                            not: r.id
                        },
                        name: r.name,
                        sku: r.sku,
                        color: r.color
                    }
                })
                    .then(async find => {
                        // console.log(find)
                        if (find) {

                            await prisma.insume.delete({
                                where: {
                                    id: find.id
                                }
                            })
                                .then(() => console.log("deletado"))
                                .catch((err) => console.log(err))

                        }
                    })



            })
        })
}

// deletadorDeInsumosDuplicados()



// console.log(a.length)

// t(a)




// const a = [
//     { color: "#d1d1d1", name: "Kit do aluno personalizado", sku: "KDA1KITKT", price: 145.00 },
//     { color: "#dde87f", name: "Stars and Heroes Starter Combo", sku: "9788543029047", price: 221.00 },
//     { color: "#dde87f", name: "Stars and Heroes Starter - SB - 1 st Ed - BK", sku: "9781292441597", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes Starter - WB - 1 st Ed - BK", sku: "9781292441696", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 1 ", sku: "9788543029818", price: 221.00 },
//     { color: "#dde87f", name: "Stars and Heroes 1 - SB - 1 st Ed - BK", sku: "9781292441580", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 1 - WB - 1 st Ed - BK", sku: "9781292441672", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 2 ", sku: "9788543029825", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 2 - SB - 1 st Ed - BK", sku: "9781292441573", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 2 - WB - 1 st Ed - BK", sku: "9781292441641", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 3 ", sku: "9788543029832", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 3 - SB - 1 st Ed - BK", sku: "9781292441702", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 3 - WB - 1 st Ed - BK", sku: "9781292441658", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 4 ", sku: "9788543029849", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 4 - SB - 1 st Ed - BK", sku: "9781292441719", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 4 - WB - 1 st Ed - BK", sku: "9781292441665", price: 111.00 },
//     { color: "#dde87f", name: "Stars and Heroes 5 ", sku: "9788543029856", price: 205.00 },
//     { color: "#dde87f", name: "Stars and Heroes 5 - SB - 1 st Ed - BK", sku: "9781292441726", price: 204.00 },
//     { color: "#dde87f", name: "Stars and Heroes 5 - WB - 1 st Ed - BK", sku: "9781292441764", price: 111.00 },

//     { color: "#e8be7f", name: "World Link Intro - SB - 4TH ED - BK", sku: "9780357502105", price: 226.90 },
//     { color: "#e8be7f", name: "World Link Intro - WB - 3TH ED - BK", sku: "9781305647848", price: 119.90 },
//     { color: "#e8be7f", name: "World Link Intro - WB - 3TH ED - AP", sku: "WLIWB3AP", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 1 - SB - 4TH ED - BK", sku: "9780357502143", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 1 - WB - 4TH ED - BK", sku: "9780357503768", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 1 - WB - 4TH ED - AP", sku: "WL1WB4AP", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 2 - SB - 4TH ED - BK", sku: "9780357503867", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 2 - WB - 4TH ED - BK", sku: "9780357503867", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 2 - WB - 4TH ED - AP", sku: "WL2WB4AP", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 3- SB - 4TH ED - BK", sku: "", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 3 - WB - 4TH ED - BK", sku: "9780357503966", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 3 - WB - 4TH ED - AP", sku: "", price: 21.20 },
//     { color: "#e8be7f", name: "World Link 4- SB - 4TH ED - BK", sku: "", price: 226.90 },
//     { color: "#e8be7f", name: "World Link 4 - WB - 4TH ED - BK", sku: "9780357504062", price: 119.90 },
//     { color: "#e8be7f", name: "World Link 4 - WB - 4TH ED - AP", sku: "WL4WB4AP", price: 21.20 },

//     { color: "#7fa7e8", name: "Short Course Adults - PK - 1st Ed- AP", sku: "SCA1PK1AP", price: 15.80 },
//     { color: "#7fa7e8", name: "Interchange Intro W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040419", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange Intro w/ PACK - SB+WB - 5th Ed - BK", sku: "9781009040556", price: 409.00 },
//     { color: "#7fa7e8", name: "Interchange Intro - WB - 5th Ed - AP", sku: "INIWB5AP", price: 24.70 },
//     { color: "#7fa7e8", name: "Interchange Intro - WB - 5th Ed - BK", sku: "9781316622377", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange Intro B - W/EBOOK - SB - 5th Ed - BK", sku: "9781009040433", price: 214.00 },
//     { color: "#7fa7e8", name: "Beginner Way Intro - WB - 1st Ed- AP", sku: "BWIWB1AP", price: 15.10 },
//     { color: "#7fa7e8", name: "Interchange 2 - W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040495", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange 1 - W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040440", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange 1 - WB - 5th Ed - BK", sku: "9781316622476", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange 1 - WB - 5th Ed - AP", sku: "IN1WB5AP", price: 24.70 },
//     { color: "#7fa7e8", name: "Interchange 1B - W/EBOOK - SB - 5th Ed - BK", sku: "9781009040488", price: 214.00 },
//     { color: "#7fa7e8", name: "Interchange 1B - WB - 5th Ed - BK", sku: "9781316622667", price: 162.00 },
//     { color: "#7fa7e8", name: "Interchange 2 - WB - 5th Ed - BK", sku: "9781316622698", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange 2 - WB - 5th Ed - AP", sku: "IN2WB5AP", price: 24.70 },
//     { color: "#7fa7e8", name: "Interchange 3 - W/ EBOOK - SB - 5th Ed - BK", sku: "9781009040525", price: 327.00 },
//     { color: "#7fa7e8", name: "Interchange 3 - WB - 5th Ed - BK", sku: "9781316622766", price: 210.00 },
//     { color: "#7fa7e8", name: "Interchange 3 - WB - 5th Ed - AP", sku: "IN3WB5AP", price: 26.10 },
//     { color: "#7fa7e8", name: "Evolve 5 - SB - 1st Ed - BK", sku: "9781009230858", price: 325.00 },
//     { color: "#7fa7e8", name: "Evolve 5 - WB - 1st Ed - BK", sku: "9781108409070", price: 221.00 },
//     { color: "#7fa7e8", name: "Evolve 5 - WB - 1st Ed - AP", sku: "EV5WB1AP", price: 26.50 },
//     { color: "#7fa7e8", name: "Evolve 6 - SB - 1st Ed - BK", sku: "9781009230889", price: 325.00 },
//     { color: "#7fa7e8", name: "Evolve 6 - WB - 1st Ed - BK", sku: "9781108409094", price: 221.00 },
//     { color: "#7fa7e8", name: "Evolve 6 - WB - 1st Ed - AP", sku: "EV6WB1AP", price: 26.50 },

//     { color: "#81e87f", name: "Short Course Espanhol - PK - 1st Ed - AP", sku: "SCEPK1AP", price: 11.10 },
//     { color: "#81e87f", name: "Vitamina B1 -  SB - 1st Ed - BK", sku: "9788416782932", price: 284.55 },
//     { color: "#81e87f", name: "Vitamina B1 - WB - 1st Ed - BK", sku: "9788416782949", price: 178.43 },
//     { color: "#81e87f", name: "Vitamina B1 - WB - 1st Ed - AP", sku: "VB1WB1AP", price: 32.90 },
//     { color: "#81e87f", name: "Vitamina B2 - SB - 1st Ed - BK", sku: "9788416782963", price: 284.55 },
//     { color: "#81e87f", name: "Vitamina B2 -  WB - 1st Ed - BK", sku: "9788416782970", price: 178.43 },
//     { color: "#81e87f", name: "Vitamina B2 -  WB - 1st Ed - AP", sku: "VB2WB1AP", price: 32.90 },
//     { color: "#81e87f", name: "Vitamina Básico (A1-A2) - SB - 1st Ed - BK", sku: "9788419065230", price: 320.16 },
//     { color: "#81e87f", name: "Vitamina Básico (A1-A2) - WB - 1st Ed - BK", sku: "9788419065247", price: 203.51 },
//     { color: "#81e87f", name: "Vitamina Básico (A1-A2) - WB - 1st Ed - AP", sku: "VBAWB1AP", price: 37.30 },
// ]


// const t = a.map(res => {
//     const increseTax = Math.ceil(res.price * 0.25 + res.price)
//     const descreaseTw = Math.floor(increseTax - increseTax * 0.2)
//     const descreaseThird = Math.floor(increseTax - increseTax * 0.3)

//     return {
//         name: res.name,
//         sku: res.sku,
//         color: res.color,
//         category: "Product",
//         price_selling: res.price,
//         price_ticket: increseTax,
//         price_card: descreaseTw,
//         price_cash: descreaseThird,
//     }
// })

// console.log(t.length)
// await prisma.insume.createMany({
//     data: t
// })
//     .then(res => console.log(res))
//     .catch(res => console.log(res))

// await await prisma.customFields.findFirst({
//     where: {
//         name: {
//             contains: "Material d"
//         }
//     }
// }).then(res => console.log(res))



