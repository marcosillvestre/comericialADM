import axios from 'axios';



export const getDataFromCep = async (cep) => {
    try {
        if (!cep) throw new Error("CEP não informado")

        const cepCleared = cep.replace(/\s+/g, "");

        const { data } = await axios.get(`https://viacep.com.br/ws/${cepCleared}/json/`)
        return data;
    } catch (error) {

        console.log({
            error: error.response,
            where: "ViaCEP",
        })

        return null
    }

}

