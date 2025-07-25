export const ReOrderDate = (string) => {
    let [day, month, year] = string.split('/');

    // Reorganiza para o formato "YYYY-MM-DD"
    let isoDate = `${year}-${month}-${day}`;

    return isoDate
}

export function DateTransformer(dateStr) {
    if (!dateStr) return "Invalid Date"
    const isoDate = ReOrderDate(dateStr) + "T00:00:00.000Z";
    return new Date(isoDate)
}


export function HandleUTCDate(date) {
    if (date === 'null') return new Date()

    let newDate = new Date(date).setUTCHours(0)

    return new Date(newDate)
}