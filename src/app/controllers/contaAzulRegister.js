import axios from 'axios';
import 'dotenv/config';

import { getToken } from '../core/getToken.js';

import moment from 'moment';

class RegisterContaAzulController {

    async storeCostumer(req, res) {

        const {
            name, contrato, unidade,
            rg, cpf, DatadeNascdoResp,
            CelularResponsavel, EnderecoResponsavel,
            NumeroEnderecoResponsavel,
            complemento, bairro, profissao,
            email, nameResponsible,
        } = req.body

        var header = {
            "Authorization": `Bearer ${await getToken(unidade)}`,
            "Content-Type": "application/json"
        }


        const customerBody = {
            "name": nameResponsible || name,
            "email": email,
            "business_phone": CelularResponsavel,
            "mobile_phone": CelularResponsavel,
            "person_type": cpf.lenght <= 11 ? "LEGAL" : "NATURAL",
            "document": cpf,
            "identity_document": rg, //
            "date_of_birth": new Date(DatadeNascdoResp.split("/").reverse().join("-")),
            "notes": contrato,
            "contacts": [
                {
                    "name": name.split("-")[0],
                    "business_phone": CelularResponsavel,
                    "email": email,
                    "job_title": profissao
                }
            ],
            "address": {
                "street": EnderecoResponsavel,
                "number": NumeroEnderecoResponsavel,
                "complement": complemento,
                "neighborhood": bairro
            }
        }


        new Promise(resolve => {
            resolve(
                axios.post('https://api.contaazul.com/v1/customers',
                    customerBody, { headers: header })
            )
        })
            .then(() => { return res.status(201).json({ message: "Success" }) })
            .catch(error => {
                if (error.response.data.message === 'CPF/CPNJ já utilizado por outro cliente.') {
                    return res.status(201).json({ message: "Success" })
                }
                if (error.response.data.message !== 'CPF/CPNJ já utilizado por outro cliente.') {
                    console.log(error)
                    return res.status(401).json({ message: error.response.data })
                }

            })



    }

    async storeContract(req, res) {
        const { name, contrato, unidade, cpf,
            cargaHoraria, numeroParcelas, descontoTotal,
            curso, valorCurso, ppFormaPg,
            ppVencimento, dataUltimaParcelaMensalidade, materialDidatico,
            mdValor, mdFormaPg, mdVencimento, service,
            tmValor, tmFormaPg, tmVencimento, nomeAluno
        } = req.body




        var header = {
            "Authorization": `Bearer ${await getToken(unidade)}`,
            "Content-Type": "application/json"
        }

        new Promise(resolve => {
            resolve(axios.get(`https://api.contaazul.com/v1/customers?document=${cpf}`,
                { headers: header }))
        }).then(async data => {
            if (data.data[0]) {

                const salesNotesString = {
                    "Valor total": parseFloat(valorCurso),
                    "Valor da Parcela": parseFloat(valorCurso) / parseInt(numeroParcelas),
                    "PP Forma PG": ppFormaPg,
                    "Parcela dia de vencimento": ppVencimento.split("/")[0],
                    "PP Vencimento": ppVencimento,
                    "Data de vencimento da última": dataUltimaParcelaMensalidade,
                    "N° de Parcelas": numeroParcelas,
                    "Desconto total": descontoTotal,
                    "MD": materialDidatico.map(res => res),
                    "MD Valor": mdValor,
                    "MD vencimento": mdVencimento,
                    "MD forma pg": mdFormaPg,
                    "TM Valor": tmValor,
                    "TM forma de pg": tmFormaPg,
                    "TM Venc": tmVencimento,
                    "Carga Horária do Curso": cargaHoraria,
                    "Unidade": unidade,
                    "Curso": curso,
                    "Aluno": nomeAluno,
                    "Responsável": name,
                    "contrato": contrato,
                    "serviço": service

                }
                const saleNotes = JSON.stringify(salesNotesString, null, 2)

                await axios.get(`https://api.contaazul.com/v1/services`, { headers: header })

                    .then(async info => {
                        const filtered = info.data?.filter(services => services.name.includes(service))

                        let value = parseFloat(valorCurso) / parseInt(numeroParcelas)

                        const body = {
                            "emission": new Date(`${ppVencimento.split("/")[1]}/${ppVencimento.split("/")[0]}/${ppVencimento.split("/")[2]}`),
                            "status": "COMMITTED",
                            "customer_id": data.data[0]?.id,
                            "services": [
                                {
                                    "description": filtered[0]?.name,
                                    "quantity": 1,
                                    "service_id": filtered[0]?.id,
                                    "value": value.toFixed(2)
                                }
                            ],
                            "discount": {
                                "measure_unit": "VALUE",
                                "rate": 0
                            },
                            "due_day": parseInt(ppVencimento.split("/")[0]),
                            "duration": parseInt(numeroParcelas),
                            "notes": saleNotes,
                            "shipping_cost": 0
                        }


                        return new Promise(resolve => {
                            resolve(
                                axios.post('https://api.contaazul.com/v1/contracts', body,
                                    { headers: header })
                                    .then(data => {
                                        if (data.status === 201 || data.status === 200) {
                                            console.log("A venda foi lançada")
                                            return res.status(200).json({ message: "Success" })
                                        }
                                    }).catch((err) => {
                                        if (err) {
                                            console.log(err)
                                            return res.status(401).json({ message: "error" })
                                        }
                                    })
                            )
                        })
                    })

            }
        })

    }

    async storeSale(req, res) {

        const {
            name, contrato, unidade, cpf,
            cargaHoraria, numeroParcelas, descontoTotal,
            curso, valorCurso, ppFormaPg,
            ppVencimento, dataUltimaParcelaMensalidade, materialDidatico,
            mdValor, mdFormaPg, mdVencimento, service,
            tmValor, tmFormaPg, tmVencimento, nomeAluno
        } = req.body

        var header = {
            "Authorization": `Bearer ${await getToken(unidade)}`,
            "Content-Type": "application/json"
        }

        new Promise(resolve => {
            resolve(axios.get(`https://api.contaazul.com/v1/customers?document=${cpf}`,
                { headers: header }))
        }).then(async data => {
            if (data.data[0]) {

                if (parseInt(mdValor) > 0) {
                    const salesNotesString = {
                        "Valor total": parseFloat(valorCurso),
                        "Valor da Parcela": parseFloat(valorCurso) / parseInt(numeroParcelas),
                        "PP Forma PG": ppFormaPg,
                        "Parcela dia de vencimento": ppVencimento.split("/")[0],
                        "PP Vencimento": ppVencimento,
                        "Data de vencimento da última": dataUltimaParcelaMensalidade,
                        "N° de Parcelas": numeroParcelas,
                        "Desconto total": descontoTotal,
                        "MD": materialDidatico.map(res => res),
                        "MD Valor": mdValor,
                        "MD vencimento": mdVencimento,
                        "MD forma pg": mdFormaPg,
                        "TM Valor": tmValor,
                        "TM forma de pg": tmFormaPg,
                        "TM Venc": tmVencimento,
                        "Carga Horária do Curso": cargaHoraria,
                        "Unidade": unidade,
                        "Curso": curso,
                        "Aluno": nomeAluno,
                        "Responsável": name,
                        "contrato": contrato,
                        "serviço": "material didatico"

                    }
                    const saleNotes = JSON.stringify(salesNotesString, null, 2)



                    let products = []
                    const product = materialDidatico.map(async teachMaterial => {
                        await axios.get(`https://api.contaazul.com/v1/products`,
                            { headers: header })
                            .then(async product => {


                                console.log(product.data)

                                // const pd = {
                                //     "description": product.data[0]?.name,
                                //     "quantity": 1,
                                //     "value": product.data[0]?.value === 0 ? product.data[0]?.value + 1 : product.data[0]?.value,
                                //     "product_id": product.data[0]?.id,
                                // }
                                // await products.push(pd)

                            })

                    })
                    await Promise.all(product)

                    if (products.length === materialDidatico.length) {

                        const formattedDate = moment(mdVencimento, "DD/MM/YYYY").toDate();
                        const teachingmaterial = {
                            "emission": data.data[0].created_at,
                            "status": "PENDING",
                            "customer_id": data.data[0].id,
                            "products": products,
                            "seller_id": "",
                            "payment": {
                                "type": "TIMES",
                                "method": "BANKING_BILLET",

                                "financial_account_id": unidade.includes("PTB") || unidade.includes("Golfinho Azul") ?
                                    "4ad586ad-3743-4d69-b311-913a66e24abb" : "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",//
                                "installments":
                                    [{
                                        "number": 1,
                                        "value": parseFloat(mdValor),
                                        "due_date": formattedDate,
                                        "status": "PENDING",
                                    }]

                            },
                            "notes": saleNotes,
                            "category_id": unidade.includes("PTB") || unidade.includes("Golfinho Azul") ?
                                "2f8a7a4e-c283-4a05-850a-c0de6a228b71" : "dcc730b4-89a6-4ccf-9dd7-7272345238d7" //
                        }

                        ContaAzulSender(teachingmaterial)

                        async function ContaAzulSender(cell) {

                            // console.log(cell)
                            // console.log(materialDidatico)


                            // return new Promise(resolve => {
                            //     resolve(
                            //         axios.post('https://api.contaazul.com/v1/sales', cell, { headers: header })
                            //             .then(data => {
                            //                 console.log(data)
                            //                 if (data.status === 201 || data.status === 200) {
                            //                     console.log("A venda foi lançada")
                            //                 }

                            //             }).catch((err) => {

                            //                 if (err.response.data.message === "The sale product's value cannot be null") {
                            //                     // console.log("produto nao encontrado")
                            //                     return res.status(401).json({ message: "Material didático não cadastrado no conta azul!" })
                            //                 }
                            //                 if (err.response.data.message !== "The sale product's value cannot be null") {
                            //                     // console.log(err)

                            //                 }
                            //             })

                            //     )
                            // })


                        }
                    }
                }


                if (parseInt(tmValor) > 0) {



                    const salesNotesString = {
                        "Valor total": parseFloat(valorCurso),
                        "Valor da Parcela": parseFloat(valorCurso) / parseInt(numeroParcelas),
                        "PP Forma PG": ppFormaPg,
                        "Parcela dia de vencimento": ppVencimento.split("/")[0],
                        "PP Vencimento": ppVencimento,
                        "Data de vencimento da última": dataUltimaParcelaMensalidade,
                        "N° de Parcelas": numeroParcelas,
                        "Desconto total": descontoTotal,
                        "MD": materialDidatico.map(res => res),
                        "MD Valor": mdValor,
                        "MD vencimento": mdVencimento,
                        "MD forma pg": mdFormaPg,
                        "TM Valor": tmValor,
                        "TM forma de pg": tmFormaPg,
                        "TM Venc": tmVencimento,
                        "Carga Horária do Curso": cargaHoraria,
                        "Unidade": unidade,
                        "Curso": curso,
                        "Aluno": nomeAluno,
                        "Responsável": name,
                        "contrato": contrato,
                        "serviço": "taxa de matricula"

                    }
                    const saleNotes = JSON.stringify(salesNotesString, null, 2)

                    const formatedTaxDate = moment(tmVencimento, "DD/MM/YYYY").toDate()

                    const taxCell = {
                        "emission": data.data[0].created_at,
                        "status": "PENDING",
                        "customer_id": data.data[0].id,
                        "seller_id": "",
                        "services": [
                            {
                                "description": "Taxa de Matrícula",
                                "quantity": 1,
                                "service_id": unidade.includes("PTB") || unidade.includes("Golfinho Azul") ?
                                    "09a1a3f8-f75e-4b25-a2ce-e815514028de" : "682c4202-e0c2-4bab-a847-c8dbe89b80d9",
                                "value": parseFloat(tmValor)
                            }
                        ],
                        "payment": {
                            "type": "TIMES",
                            "method": "BANKING_BILLET",
                            "financial_account_id": unidade.includes("PTB") || unidade.includes("Golfinho Azul") ?
                                "4ad586ad-3743-4d69-b311-913a66e24abb" : "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",//

                            "installments":
                                [{
                                    "number": 1,
                                    "value": parseFloat(tmValor),
                                    "due_date": formatedTaxDate,
                                    "status": "PENDING",
                                }]
                            ,
                        },
                        "notes": saleNotes,
                        "category_id": unidade.includes("PTB") || unidade.includes("Golfinho Azul") ?
                            "297e5d91-68c4-4ee8-aa9a-dc4b8a379767" : "b4574cdf-45b1-4647-a937-791607be9aba" //

                    }
                    ContaAzulSender(taxCell)

                    async function ContaAzulSender(cell) {
                        return new Promise(resolve => {
                            resolve(
                                axios.post('https://api.contaazul.com/v1/sales', cell, { headers: header })
                                    .then(data => {
                                        if (data.status === 201 || data.status === 200) {
                                            console.log("A venda foi lançada")

                                        }
                                    }).catch((err) => {
                                        if (err) {
                                            return res.status(401).json({ message: "Erro ao cadastrar a taxa de matrícula" })
                                        }
                                    })

                            )
                        })


                    }
                }
            }
        })

        return res.status(200).json({ message: "Success" })



    }

}

export default new RegisterContaAzulController