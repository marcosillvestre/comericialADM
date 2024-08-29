
export function getLastMondayCode(date = new Date) {
    const dayOfWeek = date.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const lastMonday = new Date(date);
    lastMonday.setDate(date.getDate() - daysSinceMonday);
    return lastMonday.toLocaleDateString("pt-BR").replace("/", "").replace("/", "");
}