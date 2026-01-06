import 'dotenv/config';
import * as yup from 'yup';
import { DateTransformer } from '../../../utils/functions/DateTransformer.js';
import { parseCurrency } from '../../../utils/functions/serializeNumbers.js';
import { createComment } from '../../../utils/functions/serializerStrings.js';
import { categorieOrCost, financial_account, paymentType } from '../../../utils/services/matches/index.js';
import { CreateContract, CreatePeople, CreateSale, GetDataForCreateSales } from '../../connection/externalConnections/contaAzulStrategy.js';
import { SendSimpleWpp } from '../../connection/externalConnections/wpp.js';
import { getNewToken } from '../../core/getToken.js';

class RegisterContaAzulController {

    async storeCostumer(req, res) {

        const schema = yup.object().shape({
            CPF: yup.string().transform((curr) => curr.replace(" ", "")).required("cpf é um campo obrigatório"),
            CelularResponsavel: yup.string().transform((curr) => curr.replace(" ", "")).required("CelularResponsavel é um campo obrigatório"),
            Email: yup.string().transform((curr) => curr.replace(" ", "")).email().required("Email é um campo obrigatório"),
            CEP: yup.string().transform((curr) => curr.replace(" ", "")).min(8, "O número válido mínimo para o CEP são 8 números").required("CEP é um campo obrigatório"),
            'Nome do responsável': yup.string().transform((curr) => curr.replace(" ", "")).required("Nome do responsável é um campo obrigatório"),
            'Data de nascimento do  responsável': yup.string().transform((curr) => curr.replace(" ", "")).required("Data de nascimento do  responsável é um campo obrigatório"),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { CelularResponsavel, Email, Bairro, CEP,
                Complemento, Unidade, CPF,
                ['Nome do responsável']: nomeResponsavel,
                ['Data de nascimento do  responsável']: nascimentoResponsavel,
                ['Nº do contrato']: contrato,
                ['Profissão']: profissao,
                ['Endereco']: endereco,
                ['Número']: numero,
            } = req.body;



            const body = {
                cpf: CPF,
                phone: CelularResponsavel,
                email: Email,
                neighboor: Bairro,
                cep: CEP,
                complement: Complemento,
                name: nomeResponsavel,
                birth: nascimentoResponsavel,
                contract: contrato,
                role: profissao,
                address: endereco,
                number: numero,
            }

            const newPeople = await CreatePeople({ unity: Unidade, body });
            return res.status(201).json(newPeople);

        } catch (error) {
            if ("errors" in error) return res.status(400).json({ message: error.errors.map(err => `\n${err}`) })


            return res.status(400).json({ message: error })
        }

    }

    async storeContract(req, res) {
        const schema = yup.object().shape({
            'CPF': yup.string().required("CPF é um campo obrigatório").min(11, "O número de caracteres não corresponde a um CPF válido"),
            'Unidade': yup.string().required("O campo Unidade não preenchido corretamente, verifique os dados"),
            CelularResponsavel: yup.string().transform((curr) => curr.replace(" ", "")).required("CelularResponsavel é um campo obrigatório"),
            Email: yup.string().transform((curr) => curr.replace(" ", "")).email().required("Email é um campo obrigatório"),
            CEP: yup.string().transform((curr) => curr.replace(" ", "")).min(8, "O número válido mínimo para o CEP são 8 números").required("CEP é um campo obrigatório"),
            'Nome do responsável': yup.string().transform((curr) => curr.replace(" ", "")).required("Nome do responsável é um campo obrigatório"),
            'Data de nascimento do  responsável': yup.string().transform((curr) => curr && curr.replace(" ", "")).required("Data de nascimento do responsável é um campo obrigatório"),

            'newService': yup.object().shape({
                data: yup.array(),
                parcels: yup.array(),
                quantity_parcels: yup.string().required("Quantidade de parcelas do curso é um campo obrigatório"),
                total: yup.number().transform((curr) => parseFloat(curr)),
                descount: yup.number().transform((curr) => parseFloat(curr)),
                payment_date: yup.string().required("Data de vencimento do produto é obrigatório"),
                payment_type: yup.string().required("Forma de pagamento do produto é obrigatório"),
            }).required("Dados sobre a parcela imcompatíveis, verifique os dados"),

        })


        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const {
                newMaterial, parcel, tax,
                newProduct, newService, newTax,

                id, Bairro, CEP,
                ['service']: servico,
                Complemento, Unidade, CPF,
                ['Data de nascimento do  responsável']: nascimentoResponsavel,
                ['Profissão']: profissao,
                ['Endereco']: endereco,
                ['Número']: numero,
                ['Material didático']: materialDidatico,
                ['Valor do desconto material didático']: valorDescontoMaterialDidatico,

                Email,
                Professor,
                CelularResponsavel,
                vendedor,
                ['Nome do responsável']: nomeResponsavel,
                ['Nome do aluno (se não for responsável próprio))']: nomeAluno,
                ['Nº do contrato']: contrato,
                ['Forma de pagamento da parcela']: formaPagamentoParcelas,
                ['Número de parcelas do curso']: parcelas,
                ['Data de Vencimento da Primeira Parcela']: vencimentoPrimeiraParcela,
                ['Data de Vencimento da Última Parcela']: vencimentoUltimaParcela,
                ['Forma de pagamento TM']: formaPagamentoTaxaMatricula,
                ['Data de pagamento TM']: dataPagamentoTaxaMatricula,
                ['Quantidade de parcelas TM ']: parcelasTaxaMatricula,
                ['Forma de pagamento do MD']: formaPagamentoMaterialDidatico,
                ['Data de pagamento MD']: vencimentoMaterialDidatico,
                ['Carga horário do curso']: cargaHoraria,
                ['Observações para o financeiro:']: observacaoFinanceiro,
                ['Observações para o pedagógico:']: observacaoPedagogico,

                ['Idade do Aluno']: idadeAluno,
                ['Quantidade de parcelas MD']: parcelasMaterial,
                ['Data da primeira aula']: dataPrimeiraAula,
                ['Horário de Inicio']: horarioInicio,
                ['Horário de fim']: horarioFim,
            } = req.body;

            const newToken = await getNewToken(Unidade);

            const { services, costs, categories, financialAccounts } = await GetDataForCreateSales({
                search: CPF, token: newToken
            })

            const bodyPerson = {
                cpf: CPF,
                phone: CelularResponsavel,
                email: Email,
                neighboor: Bairro,
                cep: CEP,
                complement: Complemento,
                name: nomeResponsavel,
                birth: nascimentoResponsavel,
                contract: contrato,
                role: profissao,
                address: endereco,
                number: numero,
            }

            const newPeople = await CreatePeople({ token: newToken, body: bodyPerson });

            if (!newPeople) return res.status(400).json({ message: "Erro ao cadastrar cliente ao conta azul, verifique os dados" });


            let venc = await DateTransformer(newService?.payment_date);
            venc.setDate(venc.getDate() - 25);

            let less25Days = venc.toLocaleDateString('pt-BR');

            const installment = newService?.parcels
            const endDate = await installment[installment.length - 1]?.date

            const saleNotes = await createComment({
                'Responsável': nomeResponsavel,
                'Aluno': nomeAluno,
                'Idade': idadeAluno,
                'Telefone para contato financeiro': CelularResponsavel,
                'Email do responsável financeiro': Email,
                'contrato': contrato,
                'Vendedor': vendedor,

                'Informações do plano financeiro': '\n',

                'VALOR DO CURSO / MENSALIDADES': '\n',

                'CAMPANHA': newService?.campaignService?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': newService?.campaignService?.description ?? 'sem campanha',
                'Valor total': parseCurrency(newService?.total),
                'Desconto total': parseCurrency(newService?.descount),
                'Forma de pagamento': newService?.payment_type ?? "sem serviço",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Quantidade de parcelas': newService?.quantity_parcels ?? "sem serviço",
                'Número de parcelas afetadas': newService?.campaignService?.affectedParcels ?? 'sem campanha',
                'Valor total da(s) parcelas(s) afetadas': newService?.campaignService ? parseCurrency(newService?.descount) : 'sem campanha',
                'Desconto da(s) parcela(s) afetadas': newService?.campaignService ? parseCurrency(newService?.descount / newService?.quantity_parcels) : 'sem campanha',
                'Número de parcelas restantes': newService?.campaignService?.affectedParcels ? parseInt(newService?.quantity_parcels) - parseInt(newService?.campaignService?.affectedParcels) : 'sem campanha',
                'Valor total da(s) parcelas(s) restante(s)': newService?.campaignService ? parseCurrency(newService?.parcels.splice(newService?.campaignService?.affectedParcels, newService?.quantity_parcels).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Dia de vencimento': newService?.payment_date ? newService?.payment_date.split("/")[0] : "sem serviço",
                'Data de Vencimento da Primeira Parcela': newService?.payment_date ?? "sem serviço",
                'Data de Vencimento da Última Parcela': endDate ?? "sem serviço",


                'TAXA DE MATRÍCULA': '\n',

                'CAMPANHA': newTax?.campaignTax?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': newTax?.campaignTax?.description ?? 'sem campanha',
                'VALOR TOTAL': parseCurrency(newTax?.total),
                'VALOR DO DESCONTO': parseCurrency(newTax?.descount),
                'VALOR LÍQUIDO': parseCurrency(newTax?.total),
                'FORMA DE PAGAMENTO': newTax?.payment_type ?? "sem taxa",
                'Vencimento': newTax?.payment_date ?? "sem taxa",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': newTax?.quantity_parcels ?? "sem taxa",
                'Valor da parcela': parseCurrency(newTax?.total / newTax?.quantity_parcels),
                'Desconto': parseCurrency(newTax?.descount),


                'MATERIAL DIDÁTICO / PRODUTOS': '\n',

                'CAMPANHA': newProduct?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA ': newProduct?.campaign?.description ?? 'sem campanha',
                'MATERIAL DIDÁTICO': newProduct?.data ? newProduct.data.map(r => r.name) : "sem material",
                'VALOR TOTAL': parseCurrency(newProduct?.total) ?? 'sem campanha',
                'VALOR DO DESCONTO': parseCurrency(newProduct?.descount) ?? 'sem campanha',
                'VALOR LÍQUIDO': parseCurrency(newProduct?.total),
                'FORMA DE PAGAMENTO': newProduct?.payment_type ?? "sem material",
                'PRIMEIRO VENCIMENTO': newProduct?.payment_date ?? "sem material",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': newProduct?.quantity_parcels ?? "sem material",
                'Valor da parcela': parseCurrency(newProduct?.total / newProduct?.quantity_parcels) ?? "Sem material",
                'Desconto por parcela': parseCurrency(newProduct?.descount / newProduct?.quantity_parcels),
                'Valor líquido por parcela': parseCurrency(newProduct?.total / newProduct?.quantity_parcels) ?? "Sem material",

                'INFORMAÇÕES PEDAGÓGICAS': '\n',

                'Data de início das aulas': dataPrimeiraAula,
                'Turma': `${dataPrimeiraAula} de ${horarioInicio} às ${horarioFim}`,
                'Professor': Professor,
                'Carga horária': cargaHoraria,
                'Unidade': Unidade,
                'Observações pedagógicas': observacaoPedagogico,
                'Observações financeiras': observacaoFinanceiro,
                'id': id,
                'serviço': 'parcela'
            })

            const serviceFiltered = services.find(ser => ser.descricao.includes(newService?.data[0].name));
            const Categorie = categories.find(cat => cat.nome.includes(categorieOrCost[newService?.data[0].name]));
            const CenterCost = costs.find(cos => cos.nome.includes("Mensalidade"));
            const FinancialAccount = financialAccounts.find(fin => fin.nome.includes(financial_account[newService?.payment_type]));

            const body = {
                idCategorie: Categorie?.id,
                idCenterCost: CenterCost?.id,
                idFinancialAccount: FinancialAccount?.id,
                idClient: newPeople?.uuid,

                serviceFiltered,

                payment: newService,

                paymentType: paymentType[formaPagamentoParcelas],
                contract: contrato,
                start: less25Days,
                end: endDate,
                emissionDate: less25Days,

                notes: saleNotes,

                firstDayToPay: newService?.payment_date,
                dueDay: parseInt(newService?.payment_date.split("/")[0]),
            }


            const newContract = await CreateContract({ token: newToken, body });

            console.log("Contrato criada com sucesso")

            return res.status(201).json(newContract)

        } catch (error) {
            console.error({
                error,
                where: "[CREATE CONTRACT]",
            })

            await SendSimpleWpp(
                "marcos",
                process.env.MARCOS,
                JSON.stringify(`[CONTRACT]: ${error} `, null, 2)

            );

            if (typeof error === 'string') return res.status(400).json({
                message: error.includes("Internal Server Error") ?
                    "Erro ao enviar esse contrato ao conta azul, dados incompatíveis" : "Resposta inesperada do servidor, tente novamente"
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors.map(err => `\n${err}`) })

            return res.status(400).json({ message: error })

        }


    }

    async storeSale(req, res) {
        const schema = yup.object().shape({
            'CPF': yup.string().required("CPF é um campo obrigatório").min(11, "O número de caracteres não corresponde a um CPF válido"),
            'Unidade': yup.string().required("O campo Unidade não preenchido corretamente, verifique os dados"),
            'Data de nascimento do  responsável': yup.string().required("A data de nascimento não foi preenchido corretamente, verifique os dados"),
            'newProduct': yup.object().shape({
                data: yup.array(),
                parcels: yup.array(),
                quantity_parcels: yup.string().required(),
                total: yup.number().transform((curr) => parseFloat(curr)),
                descount: yup.number().transform((curr) => parseFloat(curr)),
                payment_date: yup.string().required("Data de vencimento do produto é obrigatório"),
                payment_type: yup.string().required("Forma de pagamento do produto é obrigatório"),
            }).required("Dados sobre os produtos imcompatíveis, verifique os dados"),

        })


        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const {
                id, promocao, valorCurso, CPF, Curso, Unidade, Bairro, CEP, Complemento,
                material, parcel, tax,
                newProduct, newService, newTax,

                Email,
                Professor,
                CelularResponsavel,
                vendedor,
                ['Endereco']: endereco,
                ['Número']: numero,
                ['Data de nascimento do  responsável']: nascimentoResponsavel,
                ['Profissão']: profissao,
                ['service']: servico,
                ['Nome do responsável']: nomeResponsavel,
                ['Nome do aluno (se não for responsável próprio))']: nomeAluno,
                ['Idade do Aluno']: idadeAluno,
                ['Nº do contrato']: contrato,
                ['Forma de pagamento da parcela']: formaPagamentoParcelas,
                ['Número de parcelas do curso']: parcelas,
                ['Data de Vencimento da Primeira Parcela']: vencimentoPrimeiraParcela,
                ['Data de Vencimento da Última Parcela']: vencimentoUltimaParcela,
                ['Forma de pagamento TM']: formaPagamentoTaxaMatricula,
                ['Data de pagamento TM']: dataPagamentoTaxaMatricula,
                ['Quantidade de parcelas TM ']: parcelasTaxaMatricula,
                ['Forma de pagamento do MD']: formaPagamentoMaterialDidatico,
                ['Data de pagamento MD']: vencimentoMaterialDidatico,
                ['Quantidade de parcelas MD']: parcelasMaterial,
                ['Data da primeira aula']: dataPrimeiraAula,
                ['Carga horário do curso']: cargaHoraria,
                ['Observações para o financeiro:']: observacaoFinanceiro,
                ['Observações para o pedagógico:']: observacaoPedagogico,
                ['Horário de Inicio']: horarioInicio,
                ['Horário de fim']: horarioFim,

                ['Valor do Desconto na Taxa de Matrícula']: descontoTaxaMatricula,
                ['Desconto total']: descontoTotal,
                ['Material didático']: materialDidatico,
                ['Valor do desconto material didático']: valorDescontoMaterialDidatico,

            } = req.body;

            const newToken = await getNewToken(Unidade);
            const { costs, categories, financialAccounts, products } = await GetDataForCreateSales({ token: newToken, search: CPF })

            const bodyPerson = {
                cpf: CPF,
                phone: CelularResponsavel,
                email: Email,
                neighboor: Bairro,
                cep: CEP,
                complement: Complemento,
                name: nomeResponsavel,
                birth: nascimentoResponsavel,
                contract: contrato,
                role: profissao,
                address: endereco,
                number: numero,
            }

            const newPeople = await CreatePeople({
                token: newToken,
                body: bodyPerson
            });

            if (!newPeople) return res.status(400).json({ message: "Erro ao cadastrar cliente ao conta azul, verifique os dados" });

            const saleNotes = await createComment({
                'Responsável': nomeResponsavel,
                'Aluno': nomeAluno,
                'Idade': idadeAluno,
                'Telefone para contato financeiro': CelularResponsavel,
                'Email do responsável financeiro': Email,
                'contrato': contrato,
                'Vendedor': vendedor,

                'Informações do plano financeiro': '\n',

                'VALOR DO CURSO / MENSALIDADES': '\n',

                'CAMPANHA': newService?.campaignService?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': newService?.campaignService?.description ?? 'sem campanha',
                'Valor total': parseCurrency(newService?.total),
                'Desconto total': parseCurrency(newService?.descount),
                'Forma de pagamento': newService?.payment_type ?? "sem serviço",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Quantidade de parcelas': newService?.quantity_parcels ?? "sem serviço",
                'Número de parcelas afetadas': newService?.campaignService?.affectedParcels ?? 'sem campanha',
                'Valor total da(s) parcelas(s) afetadas': newService?.campaignService ? parseCurrency(newService?.descount) : 'sem campanha',
                'Desconto da(s) parcela(s) afetadas': newService?.campaignService ? parseCurrency(newService?.descount / newService?.quantity_parcels) : 'sem campanha',
                'Número de parcelas restantes': newService?.campaignService?.affectedParcels ? parseInt(newService?.quantity_parcels) - parseInt(newService?.campaignService?.affectedParcels) : 'sem campanha',
                'Valor total da(s) parcelas(s) restante(s)': newService?.campaignService ? parseCurrency(newService?.parcels.splice(newService?.campaignService?.affectedParcels, newService?.quantity_parcels).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Dia de vencimento': newService?.payment_date ? newService?.payment_date.split("/")[0] : "sem serviço",
                'Data de Vencimento da Primeira Parcela': newService?.payment_date ?? "sem serviço",


                'TAXA DE MATRÍCULA': '\n',

                'CAMPANHA': newTax?.campaignTax?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': newTax?.campaignTax?.description ?? 'sem campanha',
                'VALOR TOTAL': parseCurrency(newTax?.total),
                'VALOR DO DESCONTO': parseCurrency(newTax?.descount),
                'VALOR LÍQUIDO': parseCurrency(newTax?.total),
                'FORMA DE PAGAMENTO': newTax?.payment_type ?? "sem taxa",
                'Vencimento': newTax?.payment_date ?? "sem taxa",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': newTax?.quantity_parcels ?? "sem taxa",
                'Valor da parcela': parseCurrency(newTax?.total / newTax?.quantity_parcels),
                'Desconto': parseCurrency(newTax?.descount),


                'MATERIAL DIDÁTICO / PRODUTOS': '\n',

                'CAMPANHA': newProduct?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA ': newProduct?.campaign?.description ?? 'sem campanha',
                'MATERIAL DIDÁTICO': newProduct?.data ? newProduct.data.map(r => r.name) : "sem material",
                'VALOR TOTAL': parseCurrency(newProduct?.total) ?? 'sem campanha',
                'VALOR DO DESCONTO': parseCurrency(newProduct?.descount) ?? 'sem campanha',
                'VALOR LÍQUIDO': parseCurrency(newProduct?.total),
                'FORMA DE PAGAMENTO': newProduct?.payment_type ?? "sem material",
                'PRIMEIRO VENCIMENTO': newProduct?.payment_date ?? "sem material",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': newProduct?.quantity_parcels ?? "sem material",
                'Valor da parcela': parseCurrency(newProduct?.total / newProduct?.quantity_parcels) ?? "Sem material",
                'Desconto por parcela': parseCurrency(newProduct?.descount / newProduct?.quantity_parcels),
                'Valor líquido por parcela': parseCurrency(newProduct?.total / newProduct?.quantity_parcels) ?? "Sem material",

                'INFORMAÇÕES PEDAGÓGICAS': '\n',

                'Data de início das aulas': dataPrimeiraAula,
                'Turma': `${dataPrimeiraAula} de ${horarioInicio} às ${horarioFim}`,
                'Professor': Professor,
                'Carga horária': cargaHoraria,
                'Unidade': Unidade,
                'Observações pedagógicas': observacaoFinanceiro,
                'Observações financeiras': observacaoPedagogico,
                'id': id,
                'serviço': 'material didatico'

            });

            const errors = []

            const product = newProduct?.data.map(teachMaterial => {

                let product = products.find(data => data.codigo_sku === teachMaterial.code)

                if (!product) return errors.push(teachMaterial.name);

                return {
                    "descricao": product?.nome,
                    "quantidade": 1,
                    "valor": parseFloat(product?.valor_venda === 0) ?
                        parseFloat(product?.valor_venda + 1) : parseFloat(product?.valor_venda),
                    "id": product?.id,
                }
            })


            if (errors.length > 0) return res.status(400).json({
                message: `Na unidade do ${Unidade}, não contém o(s) produto(s): ${errors}`
            })


            const FinancialAccount = financialAccounts.find(fin => fin.nome.includes(financial_account[newProduct?.payment_type]));
            const Categorie = categories.find(cat => cat.nome.includes("Material Didático"));
            const CenterCost = costs.find(cos => cos.nome.includes("Material Didático"));

            const saleBody = {
                notes: saleNotes,

                itens: product,
                dueDay: newProduct?.payment_date,
                payment: newProduct,

                idClient: newPeople?.uuid,
                paymentType: paymentType[newProduct?.payment_type],

                idCategorie: Categorie?.id,
                idCenterCost: CenterCost?.id,
                idFinancialAccount: FinancialAccount?.id,
            }

            const newSale = await CreateSale({
                token: newToken,
                body: saleBody,
            })

            console.log("Venda criada com sucesso")

            return res.status(201).json(newSale)

        } catch (error) {

            console.log({
                error,
                where: "[CREATE SALE TO CONTA AZUL]"

            })
            await SendSimpleWpp(
                "marcos",
                process.env.MARCOS,
                JSON.stringify(`[SALE]: ${error}`, null, 2)
            );

            if (typeof error === 'string') return res.status(400).json({
                message: error.includes("Internal Server Error") ?
                    "Erro ao enviar este produto ao conta azul, dados incompatíveis" : error
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors.map(err => `\n${err}`) })


            return res.status(400).json({ message: error })

        }
    }

    async storeEnrollmentFee(req, res) {
        const schema = yup.object().shape({
            'CPF': yup.string().required("CPF é um campo obrigatório").min(11, "O número de caracteres não corresponde a um CPF válido"),
            'Unidade': yup.string().required("O campo Unidade não preenchido corretamente, verifique os dados"),
            'newTax': yup.object().shape({
                data: yup.array(),
                parcels: yup.array(),
                quantity_parcels: yup.string().required("Quantidade de parcelas é um campo obrigatório para envio da taxa de matrícula"),
                total: yup.number().transform((curr) => parseFloat(curr)),
                descount: yup.number().transform((curr) => parseFloat(curr)),
                payment_date: yup.string().required("Data de vencimento do produto é um campo obrigatório para envio da taxa de matrícula"),
                payment_type: yup.string().required("Forma de pagamento do produto é um campo obrigatório para envio da taxa de matrícula"),
            })
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { id, promocao, valorCurso, CPF, Curso, Bairro, CEP, Complemento, Unidade,
                newProduct, newService, newTax,

                tax, material, parcel,
                ['Endereco']: endereco,
                ['Número']: numero,
                ['Data de nascimento do  responsável']: nascimentoResponsavel,
                ['Profissão']: profissao,


                ['Valor do Desconto na Taxa de Matrícula']: descontoTaxaMatricula,
                ['service']: servico,
                ['Desconto total']: descontoTotal,
                ['Material didático']: materialDidatico,
                ['Valor do desconto material didático']: valorDescontoMaterialDidatico,

                Email,
                Professor,
                CelularResponsavel,
                vendedor,
                ['Nome do responsável']: nomeResponsavel,
                ['Nome do aluno (se não for responsável próprio))']: nomeAluno,
                ['Idade do Aluno']: idadeAluno,
                ['Nº do contrato']: contrato,
                ['Forma de pagamento da parcela']: formaPagamentoParcelas,
                ['Número de parcelas do curso']: parcelas,
                ['Data de Vencimento da Primeira Parcela']: vencimentoPrimeiraParcela,
                ['Data de Vencimento da Última Parcela']: vencimentoUltimaParcela,
                ['Forma de pagamento TM']: formaPagamentoTaxaMatricula,
                ['Data de pagamento TM']: dataPagamentoTaxaMatricula,
                ['Quantidade de parcelas TM ']: parcelasTaxaMatricula,
                ['Forma de pagamento do MD']: formaPagamentoMaterialDidatico,
                ['Data de pagamento MD']: vencimentoMaterialDidatico,
                ['Quantidade de parcelas MD']: parcelasMaterial,
                ['Data da primeira aula']: dataPrimeiraAula,
                ['Carga horário do curso']: cargaHoraria,
                ['Observações para o financeiro:']: observacaoFinanceiro,
                ['Observações para o pedagógico:']: observacaoPedagogico,
                ['Horário de Inicio']: horarioInicio,
                ['Horário de fim']: horarioFim,

            } = req.body

            const newToken = await getNewToken(Unidade);

            const { costs, categories, financialAccounts } = await GetDataForCreateSales({
                token: newToken,
                search: CPF
            })

            const bodyPerson = {
                cpf: CPF,
                phone: CelularResponsavel,
                email: Email,
                neighboor: Bairro,
                cep: CEP,
                complement: Complemento,
                name: nomeResponsavel,
                birth: nascimentoResponsavel,
                contract: contrato,
                role: profissao,
                address: endereco,
                number: numero,
            }

            const newPeople = await CreatePeople({ token: newToken, body: bodyPerson });

            if (!newPeople) return res.status(400).json({ message: "Erro ao cadastrar cliente ao conta azul, verifique os dados" });

            const saleNotes = await createComment({
                'Responsável': nomeResponsavel,
                'Aluno': nomeAluno,
                'Idade': idadeAluno,
                'Telefone para contato financeiro': CelularResponsavel,
                'Email do responsável financeiro': Email,
                'contrato': contrato,
                'Vendedor': vendedor,

                'Informações do plano financeiro': '\n',

                'VALOR DO CURSO / MENSALIDADES': '\n',

                'CAMPANHA': newService?.campaignService?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': newService?.campaignService?.description ?? 'sem campanha',
                'Valor total': parseCurrency(newService?.total),
                'Desconto total': parseCurrency(newService?.descount),
                'Forma de pagamento': newService?.payment_type ?? "sem serviço",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Quantidade de parcelas': newService?.quantity_parcels ?? "sem serviço",
                'Número de parcelas afetadas': newService?.campaignService?.affectedParcels ?? 'sem campanha',
                'Valor total da(s) parcelas(s) afetadas': newService?.campaignService ? parseCurrency(newService?.descount) : 'sem campanha',
                'Desconto da(s) parcela(s) afetadas': newService?.campaignService ? parseCurrency(newService?.descount / newService?.quantity_parcels) : 'sem campanha',
                'Número de parcelas restantes': newService?.campaignService?.affectedParcels ? parseInt(newService?.quantity_parcels) - parseInt(newService?.campaignService?.affectedParcels) : 'sem campanha',
                'Valor total da(s) parcelas(s) restante(s)': newService?.campaignService ? parseCurrency(newService?.parcels.splice(newService?.campaignService?.affectedParcels, newService?.quantity_parcels).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Dia de vencimento': newService?.payment_date ? newService?.payment_date.split("/")[0] : "sem serviço",
                'Data de Vencimento da Primeira Parcela': newService?.payment_date ?? "sem serviço",


                'TAXA DE MATRÍCULA': '\n',

                'CAMPANHA': newTax?.campaignTax?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': newTax?.campaignTax?.description ?? 'sem campanha',
                'VALOR TOTAL': parseCurrency(newTax?.total),
                'VALOR DO DESCONTO': parseCurrency(newTax?.descount),
                'VALOR LÍQUIDO': parseCurrency(newTax?.total),
                'FORMA DE PAGAMENTO': newTax?.payment_type ?? "sem taxa",
                'Vencimento': newTax?.payment_date ?? "sem taxa",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': newTax?.quantity_parcels ?? "sem taxa",
                'Valor da parcela': parseCurrency(newTax?.total / newTax?.quantity_parcels),
                'Desconto': parseCurrency(newTax?.descount),


                'MATERIAL DIDÁTICO / PRODUTOS': '\n',

                'CAMPANHA': newProduct?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA ': newProduct?.campaign?.description ?? 'sem campanha',
                'MATERIAL DIDÁTICO': newProduct?.data ? newProduct.data.map(r => r.name) : "sem material",
                'VALOR TOTAL': parseCurrency(newProduct?.total) ?? 'sem campanha',
                'VALOR DO DESCONTO': parseCurrency(newProduct?.descount) ?? 'sem campanha',
                'VALOR LÍQUIDO': parseCurrency(newProduct?.total),
                'FORMA DE PAGAMENTO': newProduct?.payment_type ?? "sem material",
                'PRIMEIRO VENCIMENTO': newProduct?.payment_date ?? "sem material",

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': newProduct?.quantity_parcels ?? "sem material",
                'Valor da parcela': parseCurrency(newProduct?.total / newProduct?.quantity_parcels) ?? "Sem material",
                'Desconto por parcela': parseCurrency(newProduct?.descount / newProduct?.quantity_parcels),
                'Valor líquido por parcela': parseCurrency(newProduct?.total / newProduct?.quantity_parcels) ?? "Sem material",

                'INFORMAÇÕES PEDAGÓGICAS': '\n',

                'Data de início das aulas': dataPrimeiraAula,
                'Turma': `${dataPrimeiraAula} de ${horarioInicio} às ${horarioFim}`,
                'Professor': Professor,
                'Carga horária': cargaHoraria,
                'Unidade': Unidade,
                'Observações pedagógicas': observacaoPedagogico,
                'Observações financeiras': observacaoFinanceiro,
                'id': id,
                'serviço': 'taxa de matricula'

            });

            const FinancialAccount = financialAccounts.find(fin => fin.nome.includes(financial_account[newTax?.payment_type]));
            const Categorie = categories.find(cat => cat.nome.includes("Taxa de Matrícula"));
            const CenterCost = costs.find(cos => cos.nome.includes("Taxa de Matrícula"));

            const itens = [{
                "descricao": "Taxa de Matrícula",
                "quantidade": 1,
                "valor": newTax?.total,
                "id": Unidade.includes("PTB") ?
                    "09a1a3f8-f75e-4b25-a2ce-e815514028de" : "682c4202-e0c2-4bab-a847-c8dbe89b80d9",
            }]


            const saleBody = {
                idCategorie: Categorie?.id,
                idCenterCost: CenterCost?.id,
                idFinancialAccount: FinancialAccount?.id,

                notes: saleNotes,
                idClient: newPeople.uuid,
                itens,
                payment: newTax,
                dueDay: newTax?.payment_date,
                paymentType: paymentType[newTax?.payment_type],
            }

            const newSale = await CreateSale({
                token: newToken,
                body: saleBody,
            })

            console.log("Taxa criada com sucesso")

            return res.status(201).json(newSale)

        } catch (error) {

            console.log({
                error,
                where: "[CREATE SALE TO CONTA AZUL]"
            })

            await SendSimpleWpp(
                "marcos",
                process.env.MARCOS,
                JSON.stringify(`[FEE]: ${error}`, null, 2)

            );

            if (typeof error === 'string') return res.status(400).json({
                message: error.includes("Internal Server Error") ?
                    "Erro ao enviar esta venda ao conta azul, dados incompatíveis" : error
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors.map(err => `\n${err}`) })


            return res.status(400).json({ message: error })

        }
    }
}

export default new RegisterContaAzulController