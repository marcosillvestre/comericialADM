import { gatheringDataForDatabase } from "../../app/connection/rdSearchSync.js"
import prisma from "../../database/database.js"


export const findYourValueForCustomFields = (customFieldLabel, deal_custom_fields) => {
    const value = deal_custom_fields.filter(res =>
        res.custom_field.label.includes(customFieldLabel))
        .map(res => res.value)[0]

    if (!value) return " "

    return value
}




export const bodyMakerForCustomFields = async (contractData) => {

    const { deal, phone, contacts } = contractData

    const [data] = await gatheringDataForDatabase([{ ...deal, contacts }])

    const material = findYourValueForCustomFields("Material didático", deal.deal_custom_fields)

    const materilFiltered = material[0] === "Outros" || material[0] === "Office" ?
        [] : material.map(res => { return res.split(" / ")[1] })


    const [products] = await prisma.$transaction([
        prisma.products.findMany({
            where: {
                sku: {
                    in: materilFiltered.filter(res => res !== undefined)
                }
            }
        })
    ])

    const convenio = await findYourValueForCustomFields("Tipo de Campanha / Convênio", deal.deal_custom_fields)


    const promocao = convenio && convenio.length > 0 ?
        "Sim" : "Não"


    const vendedor = findYourValueForCustomFields("Vendedor", deal.deal_custom_fields) ?
        findYourValueForCustomFields("Vendedor", deal.deal_custom_fields) : deal.user.name

    return {
        ...data.customFields,
        id: deal.id,
        promocao,
        products,
        vendedor,
        CelularResponsavel: phone,
        valorCurso: deal.deal_products[0]?.total,
        service: deal.deal_products[0]?.name,
    }

}


export const bodyFilterCustomFields = async (deal) => {

    const { id, deal_custom_fields, deal_products: [service], contacts, created_at } = deal

    const serviceName = service?.name || undefined
    const Subclasse = serviceName ? serviceName.split(' - ')[1] : serviceName;

    return {
        created_at,
        id,
        name: contacts[0]?.name || " ",
        student: findYourValueForCustomFields("Nome do aluno", deal_custom_fields),
        createdDate: findYourValueForCustomFields("Data de emissão da venda", deal_custom_fields),
        phone: contacts[0]?.phones[0]?.phone || " ",
        subclass: Subclasse,
        seller: findYourValueForCustomFields("Vendedor", deal_custom_fields),
    }
}