import axios from 'axios';



export const getDataFromCep = async (cep) => {
    try {
        const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`)
        return data
    } catch (error) {
        console.log(error)
        // throw new Error(`Error viaCep: ${error}`);
    }

}