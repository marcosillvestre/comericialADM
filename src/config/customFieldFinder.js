import prisma from "../database/database.js"
import { getDataFromCep } from '../app/connection/externalConnections/viaCep.js'


export const findYourValueForCustomFields = (customFieldLabel, deal_custom_fields) => {
    return deal_custom_fields.filter(res =>
        res.custom_field.label.includes(customFieldLabel))
        .map(res => res.value)[0]
}




export const bodyMakerForCustomFields = async (contractData) => {

    const { deal, phone, email } = contractData


    const address = await getDataFromCep(findYourValueForCustomFields("CEP", deal.deal_custom_fields))
    const material = findYourValueForCustomFields("Material didático", deal.deal_custom_fields)

    const materilFiltered = material[0] === "Outros" || material[0] === "Office" ?
        [] : material.map(res => { return res.split(" / ")[1] })


    const [cf, products] = await prisma.$transaction([

        prisma.customFields.findMany({
            orderBy: {
                order: 'asc'
            }
        }),
        prisma.products.findMany({
            where: {
                sku: {
                    in: materilFiltered
                }
            }
        })
    ])

    const data = {}

    cf.map(res => {
        data[res.name] = findYourValueForCustomFields(
            res.name,
            deal.deal_custom_fields
        )
    })

    const convenio = await findYourValueForCustomFields("Tipo de Campanha / Convênio", deal.deal_custom_fields)

    const promocao = convenio !== undefined && convenio.length > 0 ?
        "Sim" : "Não"


    const vendedor = findYourValueForCustomFields("Vendedor", deal.deal_custom_fields) ?
        findYourValueForCustomFields("Vendedor", deal.deal_custom_fields) : deal.user.name

    return {
        id: deal.id,
        endereco: address,
        products,
        promocao,
        vendedor,
        email,
        CelularResponsavel: phone,
        valorCurso: deal.deal_products[0]?.total,
        service: deal.deal_products[0]?.name,
        ...data
    }

}


export const bodyFilterCustomFields = async (deal) => {

    return {
        id: deal.id,
        name: findYourValueForCustomFields("Nome do responsável", deal.deal_custom_fields),
        student: findYourValueForCustomFields("Nome do aluno", deal.deal_custom_fields),
        createdDate: findYourValueForCustomFields("Data de emissão da venda", deal.deal_custom_fields),
        contract: findYourValueForCustomFields("Nº do contrato", deal.deal_custom_fields),
        phone: deal.contacts[0]?.phones[0]?.phone,
        subclass: findYourValueForCustomFields("Subclasse", deal.deal_custom_fields),
        seller: findYourValueForCustomFields("Vendedor", deal.deal_custom_fields),
    }
}