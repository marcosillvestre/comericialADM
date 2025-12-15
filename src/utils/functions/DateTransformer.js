export const getFirstAndLastDateOfMonth = (range) => {

    const agora = new Date();
    const primeiroDia = new Date(agora.getFullYear(), agora.getMonth() - range, 1);
    const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + range, 0);

    return { firstDate: primeiroDia, lastDate: ultimoDia };
}

export const ReOrderDate = (string) => {

    if (!string || !string.includes("/")) return null
    let [day, month, year] = string.split('/');

    // Reorganiza para o formato "YYYY-MM-DD"
    let isoDate = day.length === 1 ? `${year}-${month}-0${day}` : `${year}-${month}-${day}`;

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


export function simplifyDates(date) {

    const newDate = new Date(date).toISOString();
    const parsedDate = newDate.split("T")[0];
    return parsedDate
}


export const parseDates = (date) => {

    if (!date) return new Date()

    const dates = new Date(date).toISOString();
    const utc = dates.split("T")[0];
    const isoDate = utc + "T03:00:00.000Z";
    return new Date(isoDate).toLocaleDateString('pt-BR')
}