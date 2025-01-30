import { DateTransformer } from "./DateTransformer.js";

export const installments = async (dataPagamento, length, valor) => {
    const data = [];

    for (let index = 0; index < length; index++) {

        const dataVencimento = await DateTransformer(dataPagamento)
        const addedMonths = dataVencimento.setMonth(dataVencimento.getMonth() + index)

        data.push({
            "number": index + 1,
            "value": parseFloat(valor / length),
            "due_date": new Date(addedMonths),
            "status": "PENDING",
        })
    }

    return data
}