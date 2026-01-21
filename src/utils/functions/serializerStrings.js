
export class StringsMethods {

    spacesAndLowerCase(str) {
        if (!str) return ''
        return str.replace(/\s+/g, '').toLowerCase()
    }


    serialize(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c").replace(/Ç/g, "C");
    }

}


export const createComment = (body) => {

    return Object.entries(body)
        .map(([chave, valor]) => {

            const newValue = valor === '\n' ?
                `\n ${chave}: ${valor}` :
                `${chave}: ${valor}`

            return newValue
        })
        .join('\n');
}

export const EncodingStrings = (str) => {
    return Buffer.from(str, 'latin1').toString('utf8')
}

export const maskcpfCnpj = (value) => {

    const cleanedValue = value.replace(/\D/g, '');

    if (cleanedValue.length === 11) {
        return cleanedValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleanedValue.length === 14) {
        return cleanedValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }

    return value;
}

