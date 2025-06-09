import axios from 'axios';



export const getDataFromCep = async (cep) => {
    try {
        if (!cep) throw new Error

        const cepCleared = cep.replace(/\s+/g, "");

        const { data } = await axios.get(`https://viacep.com.br/ws/${cepCleared}/json/`)
        return data
    } catch (error) {

        console.log({
            where: "ViaCEP",
            error
        })

        return {
            Endereco: "Confira o cep indicado",
            Bairro: "Confira o cep indicado",
            Cidade: "Confira o cep indicado",
            Uf: "Confira o cep indicado",
        }
    }

}

