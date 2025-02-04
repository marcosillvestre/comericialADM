import axios from "axios"


export const getAllSales = async (headers) => {

    const start = new Date()
    start.setDate(start.getDate() - 90)

    const end = new Date()

    try {
        const { data } = await axios
            .get(`https://api.contaazul.com/v1/sales?emission_start=${start.toISOString()}&emission_end=${end.toISOString()}&size=1000`,
                { headers: headers })

        return data
    } catch (error) {
        console.log(error.data)
        return null
    }
}



const getItemId = async (item, headers) => {
    const { data } = await axios.get(`https://api.contaazul.com/v1/sales/${item}/items?Type=Product`, { headers: headers })

    return data[0]
}

export const getSaleProducts = async (headers, id) => {

    try {
        const idItem = await getItemId(id, headers)

        if (idItem.itemType !== 'PRODUCT') return


        const { data } = await axios
            .get(`https://api.contaazul.com/v1/products/${idItem.item.id}`,
                { headers: headers })

        return data
    } catch (error) {
        console.log(error.data)
        return null
    }
}


