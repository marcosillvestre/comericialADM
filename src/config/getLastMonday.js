

export class PastCodes {

    constructor() {
        this.getLastMondayCode = this.getLastMondayCode.bind(this)
        this.getLastWeekMondayCode = this.getLastWeekMondayCode.bind(this)
    }

    getLastMondayCode(date) {
        const dayOfWeek = date.getDay();
        const daysSinceMonday = (dayOfWeek + 6) % 7;


        const lastMonday = new Date(date);
        lastMonday.setDate(date.getDate() - daysSinceMonday);
        return lastMonday.toLocaleDateString("pt-BR").replace(/\//g, "");
    }


    getLastWeekMondayCode() {
        let code = this.getLastMondayCode(new Date());

        let day = parseInt(code.slice(0, 2));
        let month = parseInt(code.slice(2, 4));
        let year = parseInt(code.slice(4, 8));

        let lastMondayDate = new Date(year, month - 1, day);
        lastMondayDate.setDate(lastMondayDate.getDate() - 7);

        return lastMondayDate.toLocaleDateString("pt-BR").replace(/\//g, "");

    }
}


