
export class StringsMethods {

    spacesAndLowerCase(str) {
        return str.replace(/\s+/g, '').toLowerCase()
    }


    serialize(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c").replace(/Ç/g, "C");
    }

}

