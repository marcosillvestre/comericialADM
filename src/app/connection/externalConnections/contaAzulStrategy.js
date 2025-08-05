import axios from "axios"
import { getNewToken } from "../../core/getToken.js"

import { v4 } from "uuid"
import { ReOrderDate } from "../../../utils/functions/DateTransformer.js"
import { randomNumber } from "../../../utils/functions/serializeNumbers.js"
import { getDataFromCep } from "./viaCep.js"


export const getAllSales = async (headers, page, daysBackward, daysForward) => {

    const start = new Date()
    start.setDate(start.getDate() - daysBackward)
    start.setUTCHours(0, 0, 0, 0)

    const end = new Date()
    end.setDate(end.getDate() + daysForward)
    end.setUTCHours(23, 59, 59, 59)

    try {
        const { data } = await axios
            .get(`https://api.contaazul.com/v1/sales?emission_start=${start.toISOString()}&emission_end=${end.toISOString()}&size=200&page=${page}`,
                { headers: headers })


        return {
            data,
            has_more: data.length === 200
        }

    } catch (error) {
        console.log(error.response.data)
        return null

    }
}

export const getCustomerData = async (header, id) => {

    try {
        const { data } = await axios.get(
            `https://api.contaazul.com/v1/customers/${id}`, { headers: header })


        return data
    } catch (error) {
        console.log({ error, where: "[CUSTOMERDATA]" })
        throw new Error("Error looking for customer");

    }
}


export const getItemId = async (item, headers) => {
    const { data } = await axios.get(`https://api.contaazul.com/v1/sales/${item}/items?Type=Product`, { headers: headers })

    return data
}

export const getSaleProducts = async (headers, id) => {

    try {
        const items = await getItemId(id, headers)
        const idItem = items.filter(res => res.itemType === "PRODUCT")

        const { data } = await axios
            .get(`https://api.contaazul.com/v1/products?size=1000`,
                { headers: headers })

        const result = []

        for (let index = 0; index < idItem.length; index++) {
            const element = idItem[index];

            const founded = data.find(res => res.id === element.item.id)

            if (founded) result.push(founded)
        }

        return result
    } catch (error) {
        console.log(error)

        return null
    }
}


export const CreatePeople = async ({ unity, body }) => {

    const { cpf, phone, email, neighboor, cep,
        complement, name, birth, contract, role, address, number } = body;
    try {
        const newToken = await getNewToken(unity);
        const birthDate = await ReOrderDate(birth);
        const cepData = await getDataFromCep(cep);

        if (!cepData) throw new Error("CEP inválido");

        const { estado } = cepData;

        const doc = cpf.length > 11 ? "JURIDICA" : "FISICA"
        const typeDoc = cpf.length > 11 ? "cnpj" : "cpf"

        const newBody = {
            perfis: [
                {
                    tipo_perfil: 'CLIENTE'
                }
            ],
            tipo_pessoa: doc,
            [typeDoc]: cpf,
            nome: name,
            data_nascimento: birthDate,
            email: email,
            telefone_comercial: phone,
            celular: phone,
            ativo: true,
            codigo: contract,

            observacao: `número do contrato: ${contract} \t profissão: ${role}`,
            enderecos: [
                {
                    id: v4(),
                    cep,
                    logradouro: address,
                    numero: number,
                    complemento: complement,
                    bairro: neighboor,
                    estado
                }
            ],

        }


        const { data } = await axios.post(
            `https://api-v2.contaazul.com/v1/pessoa`,
            newBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${newToken}`
                }
            }
        );


        return data;

    } catch (error) {
        const status = error?.response?.status;
        const msg = error?.response?.data?.message || error.message || "Erro inesperado";

        console.error({
            context: "[CREATEPEOPLE]",
            status,
            message: msg,
            fullError: error?.response?.data || error,
        });

        if (msg === "O CPF digitado já está cadastrado") return body; // CPF já existe, retorna os dados recebidos
        if (msg === "CEP inválido") throw new Error(`[CREATEPEOPLE] [${status || 'Erro'}] ${msg}`);

        // Retorna erro padronizado para tratamento em nível superior

        return null
    }
}



export const CreateContract = async ({ unity, body }) => {
    const { contract, start, end, idClient, emissionDate, idCategorie,
        idCenterCost, serviceFiltered, notes, idFinancialAccount, dueDay,
        firstDayToPay, paymentType
    } = body;
    try {
        const startDate = await ReOrderDate(start);
        const endDate = await ReOrderDate(end);

        const newToken = await getNewToken(unity);

        const emission = await ReOrderDate(emissionDate);
        const payDay = await ReOrderDate(firstDayToPay);
        const numberSale = await randomNumber(1, 1000000)

        const newBody = {
            id_cliente: idClient,
            data_emissao: emission,
            id_categoria: idCategorie,
            id_centro_custo: idCenterCost,
            id_vendedor: '',
            observacoes_pagamento: '',
            observacoes: notes,
            termos: {
                tipo_frequencia: 'MENSAL',
                tipo_expiracao: 'DATA',
                data_inicio: startDate,
                data_fim: endDate,
                intervalo_frequencia: 1,
                dia_emissao_venda: 17,
                numero: 15
            },
            composicao_de_valor: {
                frete: 0,
                desconto: {
                    tipo: 'VALOR',
                    valor: 0
                }
            },
            condicao_pagamento: {
                tipo_pagamento: paymentType,
                id_conta_financeira: idFinancialAccount,
                dia_vencimento: dueDay,
                primeira_data_vencimento: payDay
            },
            itens: [
                {
                    id: serviceFiltered?.id,
                    quantidade: 1,
                    valor: serviceFiltered?.preco,
                }
            ]

        }


        console.log(JSON.stringify(newBody, null, 2))

        const { data } = await axios.post(
            `https://api-v2.contaazul.com/v1/contratos`,
            newBody,
            {
                headers: {
                    Authorization: `Bearer ${newToken}`
                }
            }
        );


        return data;

    } catch (error) {


        console.log(error)

        const status = error?.response?.status;
        const msg = error?.response?.data?.message || error.message || "Erro inesperado";

        // console.error({
        //     context: "[CREATECONTRACT]",
        //     status,
        //     message: msg,
        //     fullError: error?.response?.data || error,
        // });

        throw new Error(`[CREATECONTRACT] [${status || 'Erro'}] ${msg}`);

        // Retorna erro padronizado para tratamento em nível superior

        return null
    }
}

export async function CreateProducts({ unity, body }) {

    const { name, ean, code, description, priceSale, minStock, maxStock } = body;

    const newBody = {
        nome: name,
        codigo_sku: code,
        codigo_ean: ean,
        descricao: description,
        formato: "SIMPLES",
        estoque: {
            valor_venda: priceSale,
            estoque_minimo: minStock,
            estoque_maximo: maxStock
        },
    }

    if (!Array.isArray(unity)) throw new Error("Formato de unidade inválido!");

    try {

        const products = unity.map(async (uni) => {

            const newToken = await getNewToken(uni);

            const { data } = await axios.post(
                `https://api-v2.contaazul.com/v1/produto`,
                newBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newToken}`
                    }
                }
            );

            return data;
        })


        return products;

    } catch (error) {

        console.error({
            error,
            where: "[CREATE PRODUCTS CONTA AZUL]",
        })

        return null
    }
}

export async function CreateServices({ unity, body }) {

    const { code, description, priceSale, priceCost } = body;

    const newBody = {
        codigo: code,
        custo: priceCost,
        descricao: description,
        preco: priceSale,
        status: 'ATIVO',
        tipo_servico: 'PRESTADO'
    }

    if (!Array.isArray(unity)) throw new Error("Formato de unidade inválido!");

    try {
        const services = unity.map(async (uni) => {

            const newToken = await getNewToken(uni);

            const { data } = await axios.post(
                `https://api-v2.contaazul.com/v1/servicos`,
                newBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newToken}`
                    }
                }
            );

            return data;

        })

        return services;

    } catch (error) {

        console.error({
            error,
            where: "[CREATE SERVICES CONTA AZUL]",
        });

        return null
    }
}


// async function post(body) {
//     const newToken = await getNewToken("PTB");

//     const { name, sku, price } = body;

//     const id = await v4()
//     const resp = await fetch(
//         `https://api-v2.contaazul.com/v1/contratos`,
//         {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 Authorization: `Bearer ${newToken}`
//             },
//             body: JSON.stringify({
//                 // "id_cliente": "dc8e19b2-85c3-4834-8dec-b9e9b9e6753f",
//                 "data_emissao": new Date("2025-07-25").toISOString(),
//                 "id_categoria": "e0d5c685-fd7e-4ff1-be7a-e75844983ef3",
//                 "id_centro_custo": "dfc2738e-4ec7-11ee-a6e8-27bfd7200447",
//                 "id_vendedor": "",
//                 "observacoes_pagamento": "",
//                 // "observacoes": "\nResponsável: Warley Souza China \nAluno: undefined\nIdade: 31\nTelefone para contato financeiro: 31975303648\nEmail do responsável financeiro: warleychena1@gmail.com\ncontrato: VS270new Date(62025-1\nVendedor: Victor Souza\n\nInformações do plano financeiro:\n\nVALOR DO CURSO/MENSALIDADES:\n\nCAMPANHA: sem campanha\nDESCRIÇÃO DA CAMPANHA: sem campanha\nValor total: R$ 3.012,00\nDesconto total: R$ 312,00\nForma de pagamento: Pix cobrança\n\nDETALHAMENTO DAS PARCELAS: \n\nQuantidade de parcelas: 12\nNúmero de parcelas afetadas: sem campanha\nValor total da(s) parcelas(s) afetadas: sem campanha\nDesconto da(s) parcela(s) afetadas: sem campanha\nNúmero de parcelas restantes: sem campanha\nValor total da(s) parcelas(s) restante(s):  sem campanha\nDesconto da(s) parcela(s) restantes: sem campanha\nValor líquido da(s) parcela(s) restantes: sem campanha\nDia de vencimento: 20\nData de Vencimento da Primeira Parcela: 20/08/2025\nData de vencimento da última parcela: Erro para calcular data de fim\n\n\nTAXA DE MATRÍCULA: \n\nCAMPANHA: Isenção da taxa de matrícula\nDESCRIÇÃO DA CAMPANHA: Os beneficiários dessa campanha terão custo zero na taxa de matrícula.\nVALOR TOTAL: R$ 350,00\nVALOR DO DESCONTO: R$ 350,00\nVALOR LÍQUIDO: R$ 0,00\nFORMA DE PAGAMENTO: Sem pagamento\nVencimento: 25/06/2025\n\nDETALHAMENTO DAS PARCELAS:\n\nNúmero de parcelas: 1\nValor da parcela: R$ 0,00\nDesconto por parcela: R$ 0,00\n\n\nMATERIAL DIDÁTICO/PRODUTOS:\n\nCAMPANHA: Desconto especial no material didático\nDESCRIÇÃO DA CAMPANHA : O contratante terá desconto adicional no material didático condedido por campanha.\nMATERIAL DIDÁTICO: High School Way Student's book&Workbook Combo + Kit do aluno personalizado - Anual / 20251706\nVALOR TOTAL: R$ 525,00\nVALOR DO DESCONTO:R$ 225,00\nVALOR LÍQUIDO: R$ 525,00\nFORMA DE PAGAMENTO: Pix\nPRIMEIRO VENCIMENTO: 31/07/2025\n\nDETALHAMENTO DAS PARCELAS:\n\nNúmero de parcelas: 1\nValor da parcela: R$ 400,00\nDesconto por parcela: R$ 225,00\nValor líquido por parcela: R$ 400,00\n\n\nInformações pedagógicas: \n\nData de início das aulas: 25/06/2025 \nTurma: 25/06/2025 de 19:00 às 21:00\nProfessor: A Definir\nCarga horária: 80 \nUnidade: PTB\nObservações pedagógicas: \nObservações financeiras:undefined\nid: 685c58cec9346f0014547ec2\nserviço: parcela\n").toISOString(),
//                 "termos": {
//                     "tipo_frequencia": "MENSAL",
//                     "tipo_expiracao": "DATA",
//                     "data_inicio": new Date("2025-06-29").toISOString(),
//                     "data_fim": new Date("2026-07-29").toISOString(),
//                     // "intervalo_frequencia": 30,
//                     // "dia_emissao_venda": 17,
//                     "numero": 15
//                 },
//                 // "composicao_de_valor": {
//                 //     "frete": 0,
//                 //     "desconto": {
//                 //         "tipo": "VALOR",
//                 //         "valor": 0
//                 //     }
//                 // },
//                 "condicao_pagamento": {
//                     "tipo_pagamento": "PIX_COBRANCA",
//                     "id_conta_financeira": "c2ce4ace-a9f6-447d-934d-23982d811193",
//                     "dia_vencimento": 29,
//                     "primeira_data_vencimento": new Date("2025-06-29").toISOString()
//                 },
//                 "itens": [
//                     {
//                         "id": "7c469594-868d-48ee-95fd-27af6256b64a",
//                         "quantidade": 1,
//                         "valor": 251
//                     }
//                 ]
//             })
//         }
//     );

//     const data = await resp.json();
//     console.log(data);
// }

// post({
//     name: "teste",
//     price: 20,
//     sku: "teste"
// });



// async function get() {
//     const newToken = await getNewToken("PTB");

//     const query = new URLSearchParams({
//         pagina: '1',
//         tamanho_pagina: '100',
//         // campo_ordenacao: 'NOME',
//         // direcao_ordenacao: 'ASC',
//         termo_busca: 'teste',

//     }).toString();

//     const resp = await fetch(
//         `https://api-v2.contaazul.com/v1/pessoa?${query}`,
//         {
//             method: 'GET',
//             headers: {
//                 Authorization: `Bearer ${newToken}`
//             }
//         }
//     );

//     const { itens, itens_totais } = await resp.json();
//     console.log(itens);
// }

// get();


