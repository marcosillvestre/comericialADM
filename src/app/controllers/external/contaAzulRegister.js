import axios from 'axios';
import 'dotenv/config';
import { DateTransformer } from '../../../config/DateTransformer.js';
import { installments } from '../../../config/installments.js';
import { parseNumber } from '../../../config/serializeNumbers.js';
import { getToken } from '../../core/getToken.js';


class RegisterContaAzulController {



    async storeCostumer(req, res) {


        const { CelularResponsavel, email, Bairro, CEP, Complemento, Unidade, CPF,
            ['Nome do responsável']: nomeResponsavel,
            ['RG responsável']: rgResponsavel, ['Data de nascimento do  responsável']: nascimentoResponsavel,
            ['Nº do contrato']: contrato,
            ['Profissão']: profissao,
            ['Endereço']: endereco, ['Número']: numero,

        } = req.body

        var header = {
            "Authorization": `Bearer ${await getToken(Unidade, 'refresh')}`,
            "Content-Type": "application/json"
        }


        try {


            const customerBody = {
                "name": nomeResponsavel,
                "email": email,
                "business_phone": CelularResponsavel,
                "mobile_phone": CelularResponsavel,
                "person_type": CPF.length > 11 ? "LEGAL" : "NATURAL",
                "document": CPF,
                "identity_document": rgResponsavel,
                "date_of_birth": new Date(nascimentoResponsavel.split("/").reverse().join("-")),
                "notes": contrato,
                "contacts": [
                    {
                        "name": nomeResponsavel.split("-")[0],
                        "business_phone": CelularResponsavel,
                        "email": email,
                        "job_title": profissao
                    }
                ],
                "address": {
                    "zip_code": CEP,
                    "street": endereco,
                    "number": numero,
                    "complement": Complemento,
                    "neighborhood": Bairro
                }
            }


            await new Promise(resolve => {
                resolve(
                    axios.post('https://api.contaazul.com/v1/customers',
                        customerBody, { headers: header })
                )
            })
                .then((response) => {
                    // if(res )
                    return res.status(201).json({ message: "Success" })
                })
                .catch(error => {

                    if (error.response.data.message === 'CPF/CPNJ já utilizado por outro cliente.') {
                        return res.status(201).json({ message: "Success" })
                    }
                    if (error.response.data.message !== 'CPF/CPNJ já utilizado por outro cliente.') {
                        return res.status(401).json({ message: error.response.data.message })
                    }

                })

        } catch (error) {
            return res.status(400).json({ message: error })
        }

    }

    async storeContract(req, res) {

        const { id,
            promocao,
            vendedor,
            valorCurso,
            service,
            CPF,
            Curso,
            Unidade,
            material,
            parcel,

            ['Nome do responsável']: nomeResponsavel,
            ['Valor do Desconto na Taxa de Matrícula']: descontoTaxaMatricula,
            ['Data de pagamento TM']: dataPagamentoTaxaMatricula,
            ['Quantidade de parcelas TM ']: parcelasTaxaMatricula,
            ['Forma de pagamento TM']: formaPagamentoTaxaMatricula,
            ['Número de parcelas']: parcelas,
            ['Forma de pagamento da parcela']: formaPagamentoParcelas,
            ['Data de vencimento da primeira parcela']: vencimentoPrimeiraParcela,
            ['Data de vencimento da última parcela']: vencimentoUltimaParcela,
            ['Desconto total']: descontoTotal,
            ['Material didático']: materialDidatico,
            ['Valor do desconto material didático']: valorDescontoMaterialDidatico,
            ['Data de pagamento MD']: vencimentoMaterialDidatico,
            ['Forma de pagamento do MD']: formaPagamentoMaterialDidatico,
            ['Nome do aluno']: nomeAluno,
            ['Nº do contrato']: contrato,
            ['Carga horário do curso']: cargaHoraria,
            ['Observações importantes para o financeiro:']: observacaoFinanceiro,
            ['Observações importantes para o pedagógico:']: observacaoPedagogico,
        } = req.body




        try {

            var header = {
                "Authorization": `Bearer ${await getToken(Unidade)}`,
                "Content-Type": "application/json"
            }

            await new Promise(resolve => {
                resolve(axios.get(`https://api.contaazul.com/v1/customers?document=${CPF}`,
                    { headers: header }))
            }).then(async data => {
                if (data.data[0]) {


                    let promo = {
                        "parcelas afetadas": parcel?.campaign?.affectedParcels,
                        "tipo de desconto": parcel?.campaign?.descountType === "Value" ? "Valor Cheio" : "Porcentagem",
                        "desconto nas primeiras parcelas": parcel?.campaign?.value,
                        "descrição da campanha": parcel?.campaign?.description
                    }
                    const salesNotesString = {
                        "id": id,
                        "Valor total": valorCurso,
                        "Valor da Parcela": parseFloat(valorCurso) / parseInt(parcelas),
                        "PP Forma PG": formaPagamentoParcelas,
                        "Parcela dia de vencimento": vencimentoPrimeiraParcela.split("/")[0],
                        "Data de vencimento da primeira parcela": vencimentoPrimeiraParcela,
                        "Data de vencimento da última parcela": vencimentoUltimaParcela,
                        "N° de Parcelas": parcelas,
                        "Desconto total": descontoTotal,
                        "MD": materialDidatico.map(res => res),
                        "MD Valor": material.total,
                        "MD vencimento": vencimentoMaterialDidatico,
                        "MD forma pg": formaPagamentoMaterialDidatico,
                        "TM Valor": tax.total,
                        "TM forma de pg": formaPagamentoTaxaMatricula,
                        "TM Venc": dataPagamentoTaxaMatricula,
                        "TM parcelas": parcelasTaxaMatricula,
                        "Carga Horária do Curso": cargaHoraria,
                        "Unidade": Unidade,
                        "Curso": Curso,
                        "Aluno": nomeAluno,
                        "Responsável": nomeResponsavel,
                        "contrato": contrato,
                        "serviço": "parcela",
                        "vendedor": vendedor,
                        "observacao do rd": observacaoPedagogico,
                        "observacao para o financeiro": observacaoFinanceiro,

                        "desconto no material didatico": valorDescontoMaterialDidatico,
                        "promoção": promocao === "Sim" ? promo : "Sem promoção"
                    }

                    const saleNotes = JSON.stringify(salesNotesString, null, 2)

                    await axios.get(`https://api.contaazul.com/v1/services`, { headers: header })

                        .then(async info => {
                            const filtered = info.data?.find(services => services.name.includes(service))

                            let value = parseFloat(valorCurso) / parseInt(parcelas)

                            let venc = await DateTransformer(vencimentoPrimeiraParcela)
                            venc.setDate(venc.getDate() - 20)

                            let less20Days = venc.toISOString()


                            const body = {
                                "emission": less20Days,
                                "status": "COMMITTED",
                                "customer_id": data.data[0]?.id,
                                "services": [
                                    {
                                        "description": filtered?.name,
                                        "quantity": 1,
                                        "service_id": filtered?.id,
                                        "value": value.toFixed(2)
                                    }
                                ],
                                "discount": {
                                    "measure_unit": "VALUE",
                                    "rate": 0
                                },
                                "due_day": parseInt(vencimentoPrimeiraParcela.split("/")[0]),
                                "duration": parseInt(parcelas),
                                "notes": saleNotes,
                                "shipping_cost": 0
                            }




                            return await new Promise(resolve => {
                                resolve(
                                    axios.post('https://api.contaazul.com/v1/contracts', body,
                                        { headers: header })
                                        .then(data => {
                                            if (data.status === 201 || data.status === 200) {
                                                console.log("O contrato foi lançado")
                                                return res.status(200).json({ message: "Success" })
                                            }
                                        }).catch((err) => {
                                            if (err) {
                                                console.log(err)
                                                return res.status(401).json({
                                                    message: err.response.data.message ?
                                                        err.response.data.message : "Erro"
                                                })
                                            }
                                        })
                                )
                            })
                        })
                        .catch((err) => {

                            return res.status(400).json({ message: `Erro no cpf digitado: ${cpf}` })
                        })

                }
                if (data.data.length === 0) {
                    return res.status(400).json({ message: `Erro no cpf digitado: ${cpf}` })
                }
            })

        } catch (error) {
            return res.status(400).json({ message: error })
        }
    }

    async storeSale(req, res) {

        const { id,
            promocao,
            vendedor,
            valorCurso,
            CPF,
            Curso,
            Unidade,

            material,
            parcel,

            ['Nome do responsável']: nomeResponsavel,
            ['Valor do Desconto na Taxa de Matrícula']: descontoTaxaMatricula,
            ['Data de pagamento TM']: dataPagamentoTaxaMatricula,
            ['Quantidade de parcelas TM ']: parcelasTaxaMatricula,
            ['Forma de pagamento TM']: formaPagamentoTaxaMatricula,
            ['Número de parcelas']: parcelas,
            ['Forma de pagamento da parcela']: formaPagamentoParcelas,
            ['Data de vencimento da primeira parcela']: vencimentoPrimeiraParcela,
            ['Data de vencimento da última parcela']: vencimentoUltimaParcela,
            ['Desconto total']: descontoTotal,
            ['Material didático']: materialDidatico,
            ['Valor do desconto material didático']: valorDescontoMaterialDidatico,
            ['Data de pagamento MD']: vencimentoMaterialDidatico,
            ['Forma de pagamento do MD']: formaPagamentoMaterialDidatico,
            ['Nome do aluno']: nomeAluno,
            ['Nº do contrato']: contrato,
            ['Carga horário do curso']: cargaHoraria,
            ['Observações importantes para o financeiro:']: observacaoFinanceiro,
            ['Observações importantes para o pedagógico:']: observacaoPedagogico,

        } = req.body

        try {

            var header = {
                "Authorization": `Bearer ${await getToken(Unidade)}`,
                "Content-Type": "application/json"
            }

            await new Promise(resolve => {
                resolve(axios.get(`https://api.contaazul.com/v1/customers?document=${CPF}`,
                    { headers: header }))
            }).then(async data => {
                if (data.data[0]) {

                    const { data: sales } = await axios.get(`https://api.contaazul.com/v1/sales?customer_id=${data.data[0].id}`, { headers: header })

                    sales.map(async sale => {
                        let cleanData = sale.notes.replace(/\\n/g, "")
                        cleanData.replace(/(\s+|[^:{}\[\],]+(?=:)|:([^"]|$))/g, '')

                        const json = JSON.parse(cleanData)

                        if (json["serviço"] === "material didatico" &&
                            json["Aluno"] === nomeAluno &&
                            json["Responsável"] === nomeResponsavel &&
                            JSON.stringify(json["MD"]) === JSON.stringify(materialDidatico)) {
                            await axios.delete(`https://api.contaazul.com/v1/sales/${sale.id}`, { headers: header })
                        }
                    })


                    const sellers = await axios.get("https://api.contaazul.com/v1/sales/sellers", { headers: header })

                    let seller = vendedor.split(" ")
                    let related = sellers.data.filter(res => res.name.includes(seller[0]))


                    let promo = {
                        "parcelas afetadas": parcel?.campaign?.affectedParcels,
                        "tipo de desconto": parcel?.campaign?.descountType === "Value" ? "Valor Cheio" : "Porcentagem",
                        "desconto nas primeiras parcelas": parcel?.campaign?.value,
                        "descrição da campanha": parcel?.campaign?.description
                    }
                    const salesNotesString = {
                        "id": id,
                        "Valor total": valorCurso,
                        "Valor da Parcela": parseFloat(valorCurso) / parseInt(parcelas),
                        "PP Forma PG": formaPagamentoParcelas,
                        "Parcela dia de vencimento": vencimentoPrimeiraParcela.split("/")[0],
                        "Data de vencimento da primeira parcela": vencimentoPrimeiraParcela,
                        "Data de vencimento da última parcela": vencimentoUltimaParcela,
                        "N° de Parcelas": parcelas,
                        "Desconto total": descontoTotal,
                        "MD": materialDidatico.map(res => res),
                        "MD Valor": material.total,
                        "MD vencimento": vencimentoMaterialDidatico,
                        "MD forma pg": formaPagamentoMaterialDidatico,
                        "TM Valor": tax.total,
                        "TM forma de pg": formaPagamentoTaxaMatricula,
                        "TM Venc": dataPagamentoTaxaMatricula,
                        "TM parcelas": parcelasTaxaMatricula,
                        "Carga Horária do Curso": cargaHoraria,
                        "Unidade": Unidade,
                        "Curso": Curso,
                        "Aluno": nomeAluno,
                        "Responsável": nomeResponsavel,
                        "contrato": contrato,
                        "serviço": "material didatico",
                        "vendedor": vendedor,
                        "observacao do rd": observacaoPedagogico,
                        "observacao para o financeiro": observacaoFinanceiro,

                        "desconto no material didatico": valorDescontoMaterialDidatico,
                        "promoção": promocao === "Sim" ? promo : "Sem promoção"
                    }


                    const saleNotes = JSON.stringify(salesNotesString, null, 2)


                    let productsSale = []

                    const product = materialDidatico.map(async teachMaterial => {
                        await axios.get("https://api.contaazul.com/v1/products?size=10000",
                            { headers: header })
                            .then(async products => {
                                let splited = teachMaterial.split(" / ")[1]
                                let product;
                                if (splited !== undefined) {
                                    product = products.data.filter(data => data.code === splited)
                                }
                                if (splited === undefined) {
                                    product = products.data.filter(data => data.name.includes(teachMaterial))
                                }
                                const pd = {
                                    "description": product[0]?.name,
                                    "quantity": 1,
                                    "value": product[0]?.value === 0 ? product[0]?.value + 1 : product[0]?.value,
                                    "product_id": product[0]?.id,
                                }

                                productsSale.push(pd)

                            })

                    })

                    await Promise.all(product)


                    async function ContaAzulSender(cell) {
                        return await new Promise(resolve => {
                            resolve(
                                axios.post('https://api.contaazul.com/v1/sales', cell, { headers: header })
                                    .then(data => {
                                        if (data.status === 201 || data.status === 200) {
                                            console.log("O md foi lançado")
                                            return res.status(200).json({ message: "O md foi lançado" })
                                        }

                                    }).catch((err) => {

                                        if (err.response.data.message === "The sale product's value cannot be null") {
                                            // console.log("produto nao encontrado")
                                            return res.status(400).json({ message: "Material didático não cadastrado no conta azul!" })
                                        }
                                        if (err.response.data.message !== "The sale product's value cannot be null") {
                                            return res.status(400).json({ message: err.response.data.message })
                                        }
                                    })

                            )
                        })


                    }

                    if (productsSale.length === materialDidatico.length) {


                        let descontoMd = valorDescontoMaterialDidatico.includes(",") ?
                            parseFloat(valorDescontoMaterialDidatico.replace(",", ".")) :
                            parseNumber(valorDescontoMaterialDidatico)


                        let valorMd = material.total - descontoMd


                        const installment = await installments(dataPagamentoTaxaMatricula, material.materials.length, valorMd)
                        ////////////////
                        const teachingmaterial = {
                            "emission": new Date(),
                            "status": "PENDING",
                            "customer_id": data.data[0].id,
                            "products": productsSale,
                            "seller_id": related.length === 0 ? "" : related[0].id,
                            "discount": {
                                "measure_unit": "VALUE",
                                "rate": descontoMd
                            },
                            "payment": {
                                "type": "TIMES",
                                "method": "BANKING_BILLET",
                                "financial_account_id": Unidade.includes("PTB") || Unidade.includes("Golfinho Azul") ?
                                    "4ad586ad-3743-4d69-b311-913a66e24abb" : "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",//
                                "installments": installment
                            },
                            "notes": saleNotes,
                            "category_id": Unidade.includes("PTB") || Unidade.includes("Golfinho Azul") ?
                                "2f8a7a4e-c283-4a05-850a-c0de6a228b71" : "dcc730b4-89a6-4ccf-9dd7-7272345238d7" //
                        }
                        // console.log(JSON.stringify(teachingmaterial, null, 2))
                        await ContaAzulSender(teachingmaterial)
                    }

                    if (productsSale.length !== materialDidatico.length) {
                        return res.status(400).json({ message: "Erro no material didático" })
                    }


                }
                if (data.data.length === 0) {
                    return res.status(400).json({ message: `Erro no cpf digitado: ${CPF}` })
                }
            })

        } catch (error) {
            console.log(error)

            return res.status(400).json({ message: error })
        }
    }


    async storeEnrollmentFee(req, res) {
        const { id,
            promocao,
            vendedor,
            valorCurso,
            CPF,
            Curso,
            Unidade,
            tax,
            material,
            parcel,

            ['Nome do responsável']: nomeResponsavel,
            ['Valor do Desconto na Taxa de Matrícula']: descontoTaxaMatricula,
            ['Data de pagamento TM']: dataPagamentoTaxaMatricula,
            ['Quantidade de parcelas TM ']: parcelasTaxaMatricula,
            ['Forma de pagamento TM']: formaPagamentoTaxaMatricula,
            ['Número de parcelas']: parcelas,
            ['Forma de pagamento da parcela']: formaPagamentoParcelas,
            ['Data de vencimento da primeira parcela']: vencimentoPrimeiraParcela,
            ['Data de vencimento da última parcela']: vencimentoUltimaParcela,
            ['Desconto total']: descontoTotal,
            ['Material didático']: materialDidatico,
            ['Valor do desconto material didático']: valorDescontoMaterialDidatico,
            ['Data de pagamento MD']: vencimentoMaterialDidatico,
            ['Forma de pagamento do MD']: formaPagamentoMaterialDidatico,
            ['Nome do aluno']: nomeAluno,
            ['Nº do contrato']: contrato,
            ['Carga horário do curso']: cargaHoraria,
            ['Observações importantes para o financeiro:']: observacaoFinanceiro,
            ['Observações importantes para o pedagógico:']: observacaoPedagogico,

        } = req.body

        try {
            var header = {
                "Authorization": `Bearer ${await getToken(Unidade)}`,
                "Content-Type": "application/json"
            }

            await new Promise(resolve => {
                resolve(axios.get(`https://api.contaazul.com/v1/customers?document=${CPF}`,
                    { headers: header }))
            }).then(async data => {
                if (data.data[0]) {

                    async function ContaAzulSender(cell) {

                        return await new Promise(resolve => {
                            resolve(
                                axios.post('https://api.contaazul.com/v1/sales', cell, { headers: header })
                                    .then(data => {
                                        if (data.status === 201 || data.status === 200) {
                                            console.log("A tm foi lançada")
                                            return res.status(200).json({ message: "A tm foi lançada" })

                                        }
                                    }).catch((err) => {

                                        if (err.response.data.message === "The sale product's value cannot be null") {
                                            // console.log("produto nao encontrado")
                                            return res.status(400).json({ message: "Material didático não cadastrado no conta azul!" })
                                        }
                                        if (err.response.data.message !== "The sale product's value cannot be null") {
                                            return res.status(400).json({ message: err.response.data.message })
                                        }
                                    })
                            )
                        })
                    }

                    if (tax.total > 0) {
                        const { data: sales } = await axios.get(`https://api.contaazul.com/v1/sales?customer_id=${data.data[0].id}`, { headers: header })

                        sales.map(async sale => {
                            let cleanData = sale.notes.replace(/\\n/g, "")
                            cleanData.replace(/(\s+|[^:{}\[\],]+(?=:)|:([^"]|$))/g, '')

                            const json = JSON.parse(cleanData)


                            if (json["serviço"] === "taxa de matricula" &&
                                json["Aluno"] === nomeAluno &&
                                json["Responsável"] === nomeResponsavel &&
                                JSON.stringify(sale.total) === JSON.stringify(tax.total)) {
                                await axios.delete(`https://api.contaazul.com/v1/sales/${sale.id}`, { headers: header })
                                console.log("cópia deletada")
                            }
                        })



                        let promo = {
                            "parcelas afetadas": parcel?.campaign?.affectedParcels,
                            "tipo de desconto": parcel?.campaign?.descountType === "Value" ? "Valor Cheio" : "Porcentagem",
                            "desconto nas primeiras parcelas": parcel?.campaign?.value,
                            "descrição da campanha": parcel?.campaign?.description
                        }
                        const salesNotesString = {
                            "id": id,
                            "Valor total": valorCurso,
                            "Valor da Parcela": parseFloat(valorCurso) / parseInt(parcelas),
                            "PP Forma PG": formaPagamentoParcelas,
                            "Parcela dia de vencimento": vencimentoPrimeiraParcela.split("/")[0],
                            "Data de vencimento da primeira parcela": vencimentoPrimeiraParcela,
                            "Data de vencimento da última parcela": vencimentoUltimaParcela,
                            "N° de Parcelas": parcelas,
                            "Desconto total": descontoTotal,
                            "MD": materialDidatico.map(res => res),
                            "MD Valor": material.total,
                            "MD vencimento": vencimentoMaterialDidatico,
                            "MD forma pg": formaPagamentoMaterialDidatico,
                            "TM Valor": tax.total,
                            "TM forma de pg": formaPagamentoTaxaMatricula,
                            "TM Venc": dataPagamentoTaxaMatricula,
                            "TM parcelas": parcelasTaxaMatricula,
                            "Carga Horária do Curso": cargaHoraria,
                            "Unidade": Unidade,
                            "Curso": Curso,
                            "Aluno": nomeAluno,
                            "Responsável": nomeResponsavel,
                            "contrato": contrato,
                            "serviço": "taxa de matricula",
                            "vendedor": vendedor,
                            "observacao do rd": observacaoPedagogico,
                            "observacao para o financeiro": observacaoFinanceiro,

                            "desconto no material didatico": valorDescontoMaterialDidatico,
                            "promoção": promocao === "Sim" ? promo : "Sem promoção"
                        }
                        const saleNotes = JSON.stringify(salesNotesString, null, 2)


                        const sellers = await axios.get("https://api.contaazul.com/v1/sales/sellers",
                            { headers: header })

                        let seller = vendedor.split(" ")[0]
                        let related = sellers.data.find(res => res.name.includes(seller))


                        const installment = await installments(dataPagamentoTaxaMatricula, parcelasTaxaMatricula, tax.total)


                        const taxCell = {
                            "emission": new Date(),
                            "status": "PENDING",
                            "customer_id": data.data[0].id,
                            "seller_id": related ? related.id : "",
                            "services": [
                                {
                                    "description": "Taxa de Matrícula",
                                    "quantity": 1,
                                    "service_id": Unidade.includes("PTB") || Unidade.includes("Golfinho Azul") ?
                                        "09a1a3f8-f75e-4b25-a2ce-e815514028de" : "682c4202-e0c2-4bab-a847-c8dbe89b80d9",
                                    "value": parseFloat(tax.total)
                                }
                            ],
                            "discount": {
                                "measure_unit": "VALUE",
                                "rate": 0
                            },
                            "payment": {
                                "type": "TIMES",
                                "method": "BANKING_BILLET",
                                "financial_account_id": Unidade.includes("PTB") || Unidade.includes("Golfinho Azul") ?
                                    "4ad586ad-3743-4d69-b311-913a66e24abb" : "e7b60ea7-0ec0-48fe-a196-d2833fc70f61",//
                                "installments": installment
                                ,
                            },
                            "notes": saleNotes,
                            "category_id": Unidade.includes("PTB") || Unidade.includes("Golfinho Azul") ?
                                "297e5d91-68c4-4ee8-aa9a-dc4b8a379767" : "b4574cdf-45b1-4647-a937-791607be9aba"
                        }

                        await ContaAzulSender(taxCell)

                    }

                }

                if (data.data.length === 0) {
                    return res.status(400).json({ message: `Erro no cpf digitado: ${CPF}` })
                }
            })
                .catch(err => {
                    return res.status(400).json({ message: `Erro no cpf digitado: ${CPF}` })

                })
        } catch (error) {
            return res.status(400).json({ message: error })
        }
    }
}

export default new RegisterContaAzulController
