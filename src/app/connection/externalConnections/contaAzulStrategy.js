import axios from "axios"


export const getAllSales = async (headers) => {

    const start = new Date()
    start.setDate(start.getDate() - 90)

    const end = new Date()
    end.setDate(end.getDate() + 6)

    try {
        const { data } = await axios
            .get(`https://api.contaazul.com/v1/sales?emission_start=${start.toISOString()}&emission_end=${end.toISOString()}&size=2000`,
                { headers: headers })

        return data
    } catch (error) {
        console.log(error)
        return null
    }
}



const getItemId = async (item, headers) => {
    const { data } = await axios.get(`https://api.contaazul.com/v1/sales/${item}/items?Type=Product`, { headers: headers })

    return data
}

export const getSaleProducts = async (headers, id) => {

    try {
        const items = await getItemId(id, headers)
        const idItem = items.filter(res => res.itemType === "PRODUCT")

        const { data } = await axios
            .get(`https://api.contaazul.com/v1/products?size=1000`,
                { headers: headers })

        const result = []

        for (let index = 0; index < idItem.length; index++) {
            const element = idItem[index];

            const founded = data.find(res => res.id === element.item.id)

            if (founded) result.push(founded)
        }

        return result
    } catch (error) {
        console.log(error.data)
        return null
    }
}

export async function CreateProductsAtContaAzul(product) {



}
export async function CreateServicesAtContaAzul(product) {



}
