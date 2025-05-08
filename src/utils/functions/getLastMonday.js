import { RegisterFinder } from "../../database/registers/register.find.js";

const { registerFinderForCustomFields } = new RegisterFinder()
export class PastCodes {
    constructor() {
        this.getLastMondayCode = this.getLastMondayCode.bind(this)
        this.getLastWeekMondayCode = this.getLastWeekMondayCode.bind(this)
        this.getCodeFor2Day = this.getCodeFor2Day.bind(this)
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

    getCodeFor2Day = () => {
        let today = new Date();
        return today.toLocaleDateString("pt-BR").replace(/\//g, "")
    }

    codeContractMaker = async (name) => {
        const splitedName = name.split(" ")
        const serializeDate = await this.getCodeFor2Day()

        const encriptedCode = `${splitedName[0][0]}${splitedName[1][0]}${serializeDate}`
        const codeFounded = await registerFinderForCustomFields("Nº do contrato", encriptedCode)

        const code = await encriptedCode.concat(`-${codeFounded.length + 1}`);

        return code

    }
}



