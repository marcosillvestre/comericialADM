import { DateTransformer } from "./DateTransformer.js";

export const installments = async (date, parcels, value) => {
    if (typeof parcels !== "number") throw "Invalid parcel quantity value";

    const base = Math.floor((value / parcels) * 100) / 100;
    let parcelas = Array(parcels).fill(base);

    let soma = parcelas.reduce((a, b) => a + b, 0);
    let diferenca = Math.round((value - soma) * 100);


    for (let i = 0; i < diferenca; i++) {
        parcelas[i] = Math.round((parcelas[i] + 0.01) * 100) / 100;
    }

    return parcelas.map((res, index) => {

        const dataVencimento = DateTransformer(date)
        dataVencimento.setUTCHours(12)

        const addedMonths = dataVencimento.setMonth(dataVencimento.getMonth() + index)


        return {
            "number": index + 1,
            "status": "PENDING",
            "valor": res,
            "data_vencimento": new Date(addedMonths).toISOString().split("T")[0],
        }
    });
}