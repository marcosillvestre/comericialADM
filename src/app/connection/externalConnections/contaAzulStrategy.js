import axios from "axios"


export const getAllSales = async (headers) => {

    const start = new Date()
    start.setDate(start.getDate() - 70)

    const end = new Date()

    try {
        const { data } = await axios
            .get(`https://api.contaazul.com/v1/sales?emission_start=${start.toISOString()}&emission_end=${end.toISOString()}&size=1000`,
                { headers: headers })

        return data
    } catch (error) {
        console.log("error")
        return null
    }
}


