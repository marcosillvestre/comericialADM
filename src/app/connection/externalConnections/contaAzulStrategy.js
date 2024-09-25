import axios from "axios"


export const getAllSales = async (headers) => {

    const start = new Date()
    start.setDate(start.getDate() - 70)

    const end = new Date()

    try {
        const { data } = await axios
            .get(`https://api.contaazul.com/v1/sales?emission_start=${start.toISOString()}&emission_end=${end.toISOString()}&size=1000`,
                { headers: headers })

        const date = new Date()
        const month = date.getMonth() + 1
        const period = date.getFullYear() + "-0" + month

        const filtered = data.filter(res => res.payment.installments[0]?.due_date.includes(period))

        return filtered
    } catch (error) {
        console.log("error")
        return null
    }
}


