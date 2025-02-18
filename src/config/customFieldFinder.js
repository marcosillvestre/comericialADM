import { gatheringDataForDatabase } from "../app/connection/rdSearchSync.js"
import prisma from "../database/database.js"


export const findYourValueForCustomFields = (customFieldLabel, deal_custom_fields) => {
    return deal_custom_fields.filter(res =>
        res.custom_field.label.includes(customFieldLabel))
        .map(res => res.value)[0]
}




export const bodyMakerForCustomFields = async (contractData) => {

    const { deal, phone } = contractData

    const [data] = await gatheringDataForDatabase([deal])

    const material = findYourValueForCustomFields("Material didático", deal.deal_custom_fields)

    const materilFiltered = material[0] === "Outros" || material[0] === "Office" ?
        [] : material.map(res => { return res.split(" / ")[1] })


    const [products] = await prisma.$transaction([
        prisma.products.findMany({
            where: {
                sku: {
                    in: materilFiltered
                }
            }
        })
    ])

    const convenio = await findYourValueForCustomFields("Tipo de Campanha / Convênio", deal.deal_custom_fields)

    const promocao = convenio !== undefined && convenio.length > 0 ?
        "Sim" : "Não"


    const vendedor = findYourValueForCustomFields("Vendedor", deal.deal_custom_fields) ?
        findYourValueForCustomFields("Vendedor", deal.deal_custom_fields) : deal.user.name

    return {
        id: deal.id,
        promocao,
        products,
        vendedor,
        CelularResponsavel: phone,
        valorCurso: deal.deal_products[0]?.total,
        service: deal.deal_products[0]?.name,
        ...data.customFields
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