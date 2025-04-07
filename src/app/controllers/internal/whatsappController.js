import * as yup from 'yup';
import { SendSimpleWpp } from '../../connection/externalConnections/wpp.js';

class WhatsappController {

    async store(req, res) {
        const schema = yup.object().shape({
            name: yup.string().required("Nome é um campo obrigatório"),
            phone: yup.string().required("Número de contato é um campo obrigatório"),
            message: yup.string().required("Mensagem de aviso é um campo obrigatório")
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { name, phone, message } = req.body;
            console.log({ name, phone, message })


            new Promise((resolve, reject) => {
                SendSimpleWpp(
                    name,
                    phone,
                    message
                )
                    .then((response) => resolve(response))
                    .catch((error) => reject(error))
            })

            return res.status(201).send()

        } catch (error) {
            console.log(error)
            return res.status(500).json({ error })
        }


    }
}
export default new WhatsappController()