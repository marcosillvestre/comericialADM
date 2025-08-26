import axios from "axios"
import { getNewToken } from "../../core/getToken.js"

import { v4 } from "uuid"
import { ReOrderDate } from "../../../utils/functions/DateTransformer.js"
import { installments } from "../../../utils/functions/installments.js"
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


export const CreatePeople = async ({ token, body }) => {

    const { cpf, phone, email, neighboor, cep,
        complement, name, birth, contract, role, address, number } = body;

    try {
        const birthDate = await ReOrderDate(birth);
        const cepData = await getDataFromCep(cep);

        if (!cepData) throw ("CEP inválido");
        if (!birthDate) throw ("Data de nascimento inválida");

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
                    Authorization: `Bearer ${token}`
                }
            }
        );


        return data;

    } catch (error) {
        const status = error?.response?.status;
        const msg = error?.response?.data?.message || error.message || "Erro inesperado";

        console.error({
            fullError: error?.response?.data || error,
            status,
            message: error.response.data,
            context: "[CREATE PEOPLE]",
        });

        if (msg === "O CPF digitado já está cadastrado") {
            const { persons } = await GetDataForCreateSales({ search: cpf, token })
            return persons
        };

        if (msg === "CEP inválido") throw (`[CREATE PEOPLE] [${status || 'Erro'}] ${msg}`);

    }
}

export const DeleteDuplicateSale = async ({ unity, personId, student }) => {
    const newToken = await getNewToken(unity);
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`
    }
    const queryForSales = new URLSearchParams({ ids_clientes: personId }).toString();
    try {

        const { data } = await axios.get(`https://api-v2.contaazul.com/v1/venda/busca?${queryForSales}`,
            { headers })

        const { totais, itens } = data;

        return { totais, itens }

    } catch (error) {

        console.log({
            error: error.response,
            where: "[DELETE DUPLICATED SALES]"
        })
    }

}


export const GetDataForCreateSales = async ({ token, unity, search }) => {
    const newToken = token ?? await getNewToken(unity);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`
    }

    const queryForProducts = new URLSearchParams({ pagina: '1', tamanho_pagina: '100', status: "ATIVO" }).toString();
    const queryForCostumer = new URLSearchParams({ pagina: '1', tamanho_pagina: '1', 'documento[]': search, }).toString();
    const queryForCostCenter = new URLSearchParams({ pagina: '1', tamanho_pagina: '100', }).toString();
    const queryForCategories = new URLSearchParams({ pagina: '1', tamanho_pagina: '100', permite_apenas_filhos: 'false' }).toString();
    const queryForAccount = new URLSearchParams({ pagina: '1', tamanho_pagina: '100', apenas_ativo: 'true', }).toString();
    const queryForService = new URLSearchParams({ pagina: '1', tamanho_pagina: '100', }).toString();

    const [product, person, cost, categorie, financialAccount, service] = await Promise.all([

        axios.get(`https://api-v2.contaazul.com/v1/produto/busca?${queryForProducts}`,
            { headers }),

        axios.get(`https://api-v2.contaazul.com/v1/pessoa?${queryForCostumer}`,
            { headers }),

        axios.get(`https://api-v2.contaazul.com/v1/centro-de-custo?${queryForCostCenter}`,
            { headers }),

        axios.get(`https://api-v2.contaazul.com/v1/categorias?${queryForCategories}`,
            { headers }),

        axios.get(`https://api-v2.contaazul.com/v1/conta-financeira?${queryForAccount}`,
            { headers }),

        axios.get(`https://api-v2.contaazul.com/v1/servicos?${queryForService}`,
            { headers }),

    ])

    const { data: { itens: [persons] } } = person;
    const { data: { itens: costs } } = cost;
    const { data: { itens: categories } } = categorie;
    const { data: { itens: financialAccounts } } = financialAccount;
    const { data: { itens: services, paginacao } } = service;
    const { data: { itens: products } } = product;


    return {
        persons, costs, categories,
        financialAccounts, services, products
    }
}

export const CreateSale = async ({ token, body }) => {

    const { notes, idClient, itens, dueDay, payment,
        paymentType, idCategorie, idCenterCost, idFinancialAccount,
        parcels } = body;


    try {
        const { total, descount } = payment;

        const installment = await installments(dueDay, parseInt(parcels), total - descount);
        const numberSale = await randomNumber(1, 1000000);
        const emission = await ReOrderDate(dueDay);


        const newBody = {
            id_cliente: idClient,
            situacao: 'EM_ANDAMENTO',
            data_venda: emission,
            numero: numberSale,
            id_categoria: idCategorie,
            id_centro_custo: idCenterCost,
            observacoes: notes,
            itens,
            composicao_de_valor: {
                frete: 0,
                desconto: { tipo: 'VALOR', valor: descount }
            },
            condicao_pagamento: {
                tipo_pagamento: paymentType,
                id_conta_financeira: idFinancialAccount,
                opcao_condicao_pagamento: installment.length === 1 ?
                    'À vista' : `${installment.length}x`,
                parcelas: installment
            }
        }

        const { data } = await axios.post(
            `https://api-v2.contaazul.com/v1/venda`,
            newBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );


        return data;

    } catch (error) {

        const status = error?.response?.status;
        const msg = error?.response?.data?.message || error.message || "Erro inesperado";

        console.error({
            status,
            message: msg,
            fullError: error?.response?.data || error,
            context: "[CREATE SALE]",
        });

        if (msg.includes('(quantidade × preço unitário) + frete − desconto'))
            throw (msg)

        throw (`[CREATE SALE] [${status || 'Erro'}] ${msg}`);
    }
}

export const CreateContract = async ({ token, body }) => {

    const { start, end, idClient, emissionDate, idCategorie,
        idCenterCost, serviceFiltered, notes, idFinancialAccount, dueDay,
        firstDayToPay, paymentType, payment } = body;

    try {

        const startDate = await ReOrderDate(start);
        const endDate = await ReOrderDate(end);
        const emission = await ReOrderDate(emissionDate);
        const payDay = await ReOrderDate(firstDayToPay);
        const numberSale = await randomNumber(1, 1000000);
        const { total, descount, quantityParcels } = payment;

        const newBody = {
            id_cliente: idClient,
            termos: {
                tipo_frequencia: 'MENSAL',
                tipo_expiracao: 'DATA',
                data_inicio: startDate,
                data_fim: endDate,
                intervalo_frequencia: 1,
                dia_emissao_venda: parseInt(emission.split("-")[2]),
                numero: numberSale
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
                    valor: (total - descount) / quantityParcels,
                }
            ],
            data_emissao: emission,
            id_categoria: idCategorie,
            id_centro_custo: idCenterCost,
            observacoes: notes,
        }

        const { data } = await axios.post(
            `https://api-v2.contaazul.com/v1/contratos`,
            newBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );


        return data;

    } catch (error) {

        const status = error?.response?.status;
        const msg = error?.response?.data?.message || error.message || "Erro inesperado";

        console.error({
            status,
            message: msg,
            fullError: error?.response?.data || error,
            context: "[CREATE CONTRACT]",
        });

        throw (`[CREATE CONTRACT] [${status || 'Erro'}] ${msg}`);

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

        const products = await new Promise((resolve, reject) => {

            unity.map(async (uni) => {

                const newToken = await getNewToken(uni);

                await axios.post(
                    `https://api-v2.contaazul.com/v1/produto`,
                    newBody,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${newToken}`
                        }
                    }
                )
                    .then(r => resolve(r))
                    .catch(err => reject(err.response.data))


            })
        }
        )


        return products;

    } catch (error) {

        console.log({
            error: error.response.data,
            where: "[CREATE PRODUCTS CONTA AZUL]",
        })

        throw error
    }
}

export async function CreateServices({ unity, body }) {

    const { code, name, priceSale, priceCost } = body;

    const newBody = {
        codigo: code,
        custo: priceCost,
        descricao: name,
        preco: priceSale,
        status: 'ATIVO',
        tipo_servico: 'PRESTADO'
    }

    if (!Array.isArray(unity)) throw new Error("Formato de unidade inválido!");

    try {

        const service = await new Promise((resolve, reject) => {

            unity.map(async (uni) => {

                const newToken = await getNewToken(uni);

                await axios.post(
                    `https://api-v2.contaazul.com/v1/servicos`,
                    newBody,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${newToken}`
                        }
                    }
                )
                    .then(r => resolve(r))
                    .catch(err => reject(err.response.data))

            })
        }
        )


        return service;

    } catch (error) {

        console.error({
            error,
            where: "[CREATE SERVICES AT CONTA AZUL]",
        });

        throw error
    }
}

export async function DeleteService({ unity, name }) {
    if (!Array.isArray(unity)) throw new Error("Formato de unidade inválido!");


    const DeletePromise = await new Promise((resolve, reject) => {
        unity.map(async uni => {
            const newToken = await getNewToken(uni);

            const { services } = await GetDataForCreateSales({ unity: uni });
            const service = services.find(serv => serv.nome === name);

            if (!service) return resolve(true);

            await axios.delete(
                "https://api-v2.contaazul.com/v1/servicos",
                { ids: [service.id] },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newToken}`
                    }
                }
            )
                .then(r => resolve(r))
                .then(err => reject(err.response.data))

        })

    })

    return DeletePromise;
}