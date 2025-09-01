export const parseNumber = (number) => {
    if (number === '' || number === undefined) return 0

    if (typeof number === 'string') {

        const parsed = number.includes(",") ?
            parseFloat(number.replace(",", ".")) :
            parseInt(number)

        return parsed
    }

    return number
}


export const parseCurrency = (number) => {
    if (!number) return 0

    const currency = (value) => value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'brl'
    });

    if (number === '' || number === undefined) return currency(0);


    if (typeof number === 'string') {

        const parsed = number.includes(",") ?
            parseFloat(number.replace(",", ".")) :
            parseInt(number)

        return currency(parsed)
    }

    return currency(number)
}



export const randomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

