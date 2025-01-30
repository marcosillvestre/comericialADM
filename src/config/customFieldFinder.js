import prisma from "../database/database.js"

export const findYourValueForCustomFields = (customFieldLabel, deal_custom_fields) => {
    return deal_custom_fields.filter(res =>
        res.custom_field.label.includes(customFieldLabel))
        .map(res => res.value)[0]
}




export const bodyMakerForCustomFields = async (deal) => {

    const cf = await prisma.customFields.findMany({
        orderBy: {
            order: 'asc'
        }
    })

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
        promocao,
        vendedor,
        CelularResponsavel: deal.contacts[0]?.phones[0]?.phone,
        email: deal.contacts[0]?.emails[0]?.email,
        valorCurso: deal.deal_products[0]?.total,
        service: deal.deal_products[0]?.name,
        ...data
    }

}
