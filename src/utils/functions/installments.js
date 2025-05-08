import { DateTransformer } from "./DateTransformer.js";

export const installments = async (dataPagamento, length, valor) => {
    if (!dataPagamento) return []

    const data = [];

    for (let index = 0; index < length; index++) {

        const dataVencimento = await DateTransformer(dataPagamento)
        dataVencimento.setUTCHours(12)

        const addedMonths = dataVencimento.setMonth(dataVencimento.getMonth() + index)

        data.push({
            "number": index + 1,
            "value": parseFloat(valor / length).toFixed(2),
            "due_date": new Date(addedMonths),
            "status": "PENDING",
        })
    }

    return data
}