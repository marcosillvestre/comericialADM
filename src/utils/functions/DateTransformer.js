export function DateTransformer(dateStr) {
    if (!dateStr) return "Invalid Date"
    let [day, month, year] = dateStr.split('/');

    // Reorganiza para o formato "YYYY-MM-DD"
    let isoDate = `${year}-${month}-${day}T00:00:00.000Z`;

    return new Date(isoDate)
}


export function HandleUTCDate(date) {
    if (date === 'null') return new Date()

    let newDate = new Date(date).setUTCHours(0)

    return new Date(newDate)
}