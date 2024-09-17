export function DateTransformer(dateStr) {
    let [day, month, year] = dateStr.split('/');

    // Reorganiza para o formato "YYYY-MM-DD"
    let isoDate = `${year}-${month}-${day}T00:00:00.000Z`;

    return new Date(isoDate)
}

