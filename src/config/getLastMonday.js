

export class PastCodes {

    getLastMondayCode(date) {
        const dayOfWeek = date.getDay();
        const daysSinceMonday = (dayOfWeek + 6) % 7;


        const lastMonday = new Date(date);
        lastMonday.setDate(date.getDate() - daysSinceMonday);
        return lastMonday.toLocaleDateString("pt-BR").replace("/", "").replace("/", "");
    }


    getLastWeekMondayCode() {
        let code = getLastMondayCode();

        code.split();

        let splited = code.replace(code[1], code[1] - 7);

        return splited;

    }
}   
