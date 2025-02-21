import axios from 'axios';



export const getDataFromCep = async (cep) => {
    try {
        const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`)
        return data
    } catch (error) {
        console.log(error.data)
        // throw new Error(`Error viaCep: ${error}`);

        return {
            Endereco: "Confira o cep indicado",
            Bairro: "Confira o cep indicado",
            Cidade: "Confira o cep indicado",
            Uf: "Confira o cep indicado",
        }
    }

}

