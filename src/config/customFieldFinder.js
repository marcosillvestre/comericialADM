export const findYourValueForCustomFields = (customFieldLabel, deal_custom_fields) => {
    return deal_custom_fields.filter(res =>
        res.custom_field.label.includes(customFieldLabel))
        .map(res => res.value)[0]
}