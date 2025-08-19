import 'dotenv/config';
import * as yup from 'yup';
import { DateTransformer } from '../../../utils/functions/DateTransformer.js';
import { parseCurrency } from '../../../utils/functions/serializeNumbers.js';
import { createComment } from '../../../utils/functions/serializerStrings.js';
import { categorieOrCost, financial_account, paymentType } from '../../../utils/services/matches/index.js';
import { CreateContract, CreatePeople, CreateSale, GetDataForCreateSales } from '../../connection/externalConnections/contaAzulStrategy.js';
import { SendSimpleWpp } from '../../connection/externalConnections/wpp.js';

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
            if ("errors" in error) return res.status(400).json({ message: `Campos inválidos: ${error.errors}` })

            return res.status(400).json({ message: error })
        }

    }

    async storeContract(req, res) {
        const schema = yup.object().shape({
            'Data de Vencimento da Última Parcela': yup.string().required("Data de vencimento da primeira parcela é um campo obrigatório"),
            'Data de Vencimento da Primeira Parcela': yup.string().required("Houve um erro no cálculo da Data de vencimento da última parcela verifique seus dados"),
            'CPF': yup.string().required("CPF é um campo obrigatório").min(11, "O número de caracteres não corresponde a um CPF válido"),
            'Unidade': yup.string().required("O campo Unidade não preenchido corretamente, verifique os dados"),
            'parcel': yup.object().required("Dados sobre a parcela não foram preenchidos da maneira correta, verifique os dados"),
            'Forma de pagamento da parcela': yup.string().required("Forma de pagamento da parcela é um campo obrigatório"),

        })


        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { id, promocao, valorCurso,
                CPF, Curso, Unidade,

                material,
                parcel,
                tax,
                ['service']: servico,
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


            const { persons, services, costs, categories, financialAccounts } = await GetDataForCreateSales({ search: CPF, unity: Unidade })

            if (!persons) return res.status(400).json({ message: "CPF inválido, cliente não encontrado no conta azul" });

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

                'CAMPANHA': parcel?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': parcel?.campaign?.description ?? 'sem campanha',
                'Valor total': parseCurrency(parcel.total),
                'Desconto total': parseCurrency(parcel.descount),
                'Forma de pagamento': formaPagamentoParcelas,

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Quantidade de parcelas': parcelas,
                'Número de parcelas afetadas': parcel?.campaign?.affectedParcels ?? 'sem campanha',
                'Valor total da(s) parcelas(s) afetadas': parcel?.campaign ? parseCurrency(parcel.parcels.splice(0, parcel?.campaign?.affectedParcels).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Desconto da(s) parcela(s) afetadas': parcel?.campaign ? parseCurrency(parcel.parcels.splice(0, parcel?.campaign?.affectedParcels).reduce((acc, item) => acc + item.descount, 0)) : 'sem campanha',
                'Número de parcelas restantes': parcel?.campaign?.affectedParcels ? parseInt(parcelas) - parseInt(parcel?.campaign?.affectedParcels) : 'sem campanha',
                'Valor total da(s) parcelas(s) restante(s)': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Desconto da(s) parcela(s) restantes': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item.descount, 0)) : 'sem campanha',
                'Valor líquido da(s) parcela(s) restantes': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Dia de vencimento': vencimentoPrimeiraParcela.split("/")[0],
                'Data de Vencimento da Primeira Parcela': vencimentoPrimeiraParcela,
                'Data de Vencimento da Última Parcela': vencimentoUltimaParcela,


                'TAXA DE MATRÍCULA': '\n',

                'CAMPANHA': tax?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': tax?.campaign?.description ?? 'sem campanha',
                'VALOR TOTAL': parseCurrency(350),
                'VALOR DO DESCONTO': parseCurrency(tax.descount),
                'VALOR LÍQUIDO': parseCurrency(tax.total),
                'FORMA DE PAGAMENTO': formaPagamentoTaxaMatricula,
                'Vencimento': dataPagamentoTaxaMatricula,

                'DETALHAMENTO DAS PARCELAS': '\n',


                'Número de parcelas': parcelasTaxaMatricula,
                'Valor da parcela': parseCurrency(tax.taxes[0]?.valor),
                'Desconto por parcela': parseCurrency(tax.total / tax.taxes.length),


                'MATERIAL DIDÁTICO / PRODUTOS': '\n',

                'CAMPANHA': material?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA ': material?.campaign?.description ?? 'sem campanha',
                'MATERIAL DIDÁTICO': materialDidatico,
                'VALOR TOTAL': parseCurrency(material?.total) ?? 'sem campanha',
                'VALOR DO DESCONTO': parseCurrency(material?.descount) ?? 'sem campanha',
                'VALOR LÍQUIDO': parseCurrency(material?.total),
                'FORMA DE PAGAMENTO': formaPagamentoMaterialDidatico,
                'PRIMEIRO VENCIMENTO': vencimentoMaterialDidatico,

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': parcelasMaterial,
                'Valor da parcela': parseCurrency(material.materials[0]?.valor) ?? "Sem material",
                'Desconto por parcela': parseCurrency(material.descount / material.materials.length),
                'Valor líquido por parcela': parseCurrency(material.materials[0]?.valor) ?? "Sem material",


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


            const serviceFiltered = services.find(ser => ser.descricao.includes(servico));
            const Categorie = categories.find(cat => cat.nome.includes(categorieOrCost[servico]));
            const CenterCost = costs.find(cos => cos.nome.includes("Mensalidade"));
            const FinancialAccount = financialAccounts.find(fin => fin.nome.includes(financial_account[formaPagamentoParcelas]));


            let venc = await DateTransformer(vencimentoPrimeiraParcela);
            venc.setDate(venc.getDate() - 25);

            let less25Days = venc.toLocaleDateString('pt-BR');

            const body = {
                idCategorie: Categorie?.id,
                idCenterCost: CenterCost?.id,
                idFinancialAccount: FinancialAccount?.id,

                serviceFiltered,
                idClient: persons?.uuid,
                paymentType: paymentType[formaPagamentoParcelas],
                contract: contrato,
                start: vencimentoPrimeiraParcela,
                end: vencimentoUltimaParcela,
                emissionDate: less25Days,
                notes: saleNotes,
                firstDayToPay: vencimentoPrimeiraParcela,
                dueDay: parseInt(vencimentoPrimeiraParcela.split("/")[0]),
            }

            const newContract = await CreateContract({ unity: Unidade, body });
            console.log("Contrato criada com sucesso")

            return res.status(201).json(newContract)

        } catch (error) {
            console.error({
                error,
                where: "[CREATE CONTRACT]",
            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(400).json({ message: error })

        }


    }

    async storeSale(req, res) {
        const schema = yup.object().shape({
            'Forma de pagamento do MD': yup.string().required("Forma de pagamento do MD é um campo obrigatório"),
            'Data de pagamento MD': yup.string().required("Data de pagamento MD é um campo obrigatório"),
            'Quantidade de parcelas MD': yup.string().required("Quantidade de parcelas MD é um campo obrigatório"),


            'CPF': yup.string().required("CPF é um campo obrigatório").min(11, "O número de caracteres não corresponde a um CPF válido"),
            'Unidade': yup.string().required("O campo Unidade não preenchido corretamente, verifique os dados"),
            'tax': yup.object().required("Dados sobre a parcela não foram preenchidos da maneira correta, verifique os dados"),
            'Forma de pagamento da parcela': yup.string().required("Forma de pagamento da parcela é um campo obrigatório"),

        })


        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const {
                id, promocao, valorCurso, CPF, Curso, Unidade,

                material,
                parcel,
                tax,

                Email,
                Professor,
                CelularResponsavel,
                vendedor,
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

            const { persons, costs, categories, financialAccounts, products } = await GetDataForCreateSales({ unity: Unidade, search: CPF })

            if (!persons) return res.status(400).json({ message: "CPF inválido, cliente não encontrado no conta azul" });

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

                'CAMPANHA': parcel?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': parcel?.campaign?.description ?? 'sem campanha',
                'Valor total': parseCurrency(parcel.total),
                'Desconto total': parseCurrency(parcel.descount),
                'Forma de pagamento': formaPagamentoParcelas,

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Quantidade de parcelas': parcelas,
                'Número de parcelas afetadas': parcel?.campaign?.affectedParcels ?? 'sem campanha',
                'Valor total da(s) parcelas(s) afetadas': parcel?.campaign ? parseCurrency(parcel.parcels.splice(0, parcel?.campaign?.affectedParcels).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Desconto da(s) parcela(s) afetadas': parcel?.campaign ? parseCurrency(parcel.parcels.splice(0, parcel?.campaign?.affectedParcels).reduce((acc, item) => acc + item.descount, 0)) : 'sem campanha',
                'Número de parcelas restantes': parcel?.campaign?.affectedParcels ? parseInt(parcelas) - parseInt(parcel?.campaign?.affectedParcels) : 'sem campanha',
                'Valor total da(s) parcelas(s) restante(s)': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Desconto da(s) parcela(s) restantes': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item.descount, 0)) : 'sem campanha',
                'Valor líquido da(s) parcela(s) restantes': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Dia de vencimento': vencimentoPrimeiraParcela.split("/")[0],
                'Data de Vencimento da Primeira Parcela': vencimentoPrimeiraParcela,
                'Data de Vencimento da Última Parcela': vencimentoUltimaParcela,


                'TAXA DE MATRÍCULA': '\n',

                'CAMPANHA': tax?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': tax?.campaign?.description ?? 'sem campanha',
                'VALOR TOTAL': parseCurrency(350),
                'VALOR DO DESCONTO': parseCurrency(tax.descount),
                'VALOR LÍQUIDO': parseCurrency(tax.total),
                'FORMA DE PAGAMENTO': formaPagamentoTaxaMatricula,
                'Vencimento': dataPagamentoTaxaMatricula,

                'DETALHAMENTO DAS PARCELAS': '\n',


                'Número de parcelas': parcelasTaxaMatricula,
                'Valor da parcela': parseCurrency(tax.taxes[0]?.valor),
                'Desconto por parcela': parseCurrency(tax.total / tax.taxes.length),


                'MATERIAL DIDÁTICO / PRODUTOS': '\n',

                'CAMPANHA': material?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA ': material?.campaign?.description ?? 'sem campanha',
                'MATERIAL DIDÁTICO': materialDidatico,
                'VALOR TOTAL': parseCurrency(material?.total) ?? 'sem campanha',
                'VALOR DO DESCONTO': parseCurrency(material?.descount) ?? 'sem campanha',
                'VALOR LÍQUIDO': parseCurrency(material?.total),
                'FORMA DE PAGAMENTO': formaPagamentoMaterialDidatico,
                'PRIMEIRO VENCIMENTO': vencimentoMaterialDidatico,

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': parcelasMaterial,
                'Valor da parcela': parseCurrency(material.materials[0]?.valor) ?? "Sem material",
                'Desconto por parcela': parseCurrency(material.descount / material.materials.length),
                'Valor líquido por parcela': parseCurrency(material.materials[0]?.valor) ?? "Sem material",


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

            const product = materialDidatico.map(teachMaterial => {
                let splited = teachMaterial.split(" / ")[1].replace(/\s+/g, "")

                let product = products.find(data => data.codigo_sku === splited ?? teachMaterial)

                return {
                    "descricao": product?.nome,
                    "quantidade": 1,
                    "valor": parseInt(product?.valor_venda === 0) ? parseInt(product?.valor_venda + 1) : parseInt(product?.valor_venda),
                    "id": product?.id,
                }

            })

            if (product.find(pd => !pd.id)) return res.status(400).json({ message: `Material didático não está presente no conta azul da unidade ${Unidade}` })


            const FinancialAccount = financialAccounts.find(fin => fin.nome.includes(financial_account[formaPagamentoMaterialDidatico]));
            const Categorie = categories.find(cat => cat.nome.includes("Material Didático"));
            const CenterCost = costs.find(cos => cos.nome.includes("Material Didático"));

            const saleBody = {
                notes: saleNotes,

                itens: product,
                parcels: parcelasMaterial,
                dueDay: vencimentoMaterialDidatico,
                payment: material,

                idClient: persons.uuid,
                paymentType: paymentType[formaPagamentoMaterialDidatico],

                idCategorie: Categorie?.id,
                idCenterCost: CenterCost?.id,
                idFinancialAccount: FinancialAccount?.id,

            }



            const newSale = await CreateSale({
                unity: Unidade,
                body: saleBody,
            })

            console.log("Venda criada com sucesso")

            return res.status(201).json(newSale)

        } catch (error) {

            console.log({
                error,
                where: "[CREATE SALE TO CONTA AZUL]"

            })

            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(400).json({ message: error })

        }
    }

    async storeEnrollmentFee(req, res) {
        const schema = yup.object().shape({
            'Forma de pagamento TM': yup.string().required("Data de vencimento da primeira parcela é um campo obrigatório"),
            'tax': yup.object().required("Dados sobre a taxa de matrícula não foram preenchidos da maneira correta, verifique os dados"),
            'Data de pagamento TM': yup.string().required("Data de pagamento da taxa de matrícula é um campo obrigatório, verifique seus dados"),
            'CPF': yup.string().required("CPF é um campo obrigatório").min(11, "O número de caracteres não corresponde a um CPF válido"),
            'Unidade': yup.string().required("O campo Unidade não preenchido corretamente, verifique os dados"),
        })

        try {
            await schema.validateSync(req.body, { abortEarly: false })

            const { id, promocao, valorCurso, CPF, Curso,
                Unidade, tax, material, parcel,

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

            const { persons, costs, categories, financialAccounts } = await GetDataForCreateSales({ unity: Unidade, search: CPF })

            if (!persons) return res.status(400).json({ message: "CPF inválido, cliente não encontrado no conta azul" });

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

                'CAMPANHA': parcel?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': parcel?.campaign?.description ?? 'sem campanha',
                'Valor total': parseCurrency(parcel.total),
                'Desconto total': parseCurrency(parcel.descount),
                'Forma de pagamento': formaPagamentoParcelas,

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Quantidade de parcelas': parcelas,
                'Número de parcelas afetadas': parcel?.campaign?.affectedParcels ?? 'sem campanha',
                'Valor total da(s) parcelas(s) afetadas': parcel?.campaign ? parseCurrency(parcel.parcels.splice(0, parcel?.campaign?.affectedParcels).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Desconto da(s) parcela(s) afetadas': parcel?.campaign ? parseCurrency(parcel.parcels.splice(0, parcel?.campaign?.affectedParcels).reduce((acc, item) => acc + item.descount, 0)) : 'sem campanha',
                'Número de parcelas restantes': parcel?.campaign?.affectedParcels ? parseInt(parcelas) - parseInt(parcel?.campaign?.affectedParcels) : 'sem campanha',
                'Valor total da(s) parcelas(s) restante(s)': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Desconto da(s) parcela(s) restantes': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item.descount, 0)) : 'sem campanha',
                'Valor líquido da(s) parcela(s) restantes': parcel?.campaign ? parseCurrency(parcel.parcels.splice(parcel?.campaign?.affectedParcels, parcelas).reduce((acc, item) => acc + item?.valor, 0)) : 'sem campanha',
                'Dia de vencimento': vencimentoPrimeiraParcela.split("/")[0],
                'Data de Vencimento da Primeira Parcela': vencimentoPrimeiraParcela,
                'Data de Vencimento da Última Parcela': vencimentoUltimaParcela,


                'TAXA DE MATRÍCULA': '\n',

                'CAMPANHA': tax?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA': tax?.campaign?.description ?? 'sem campanha',
                'VALOR TOTAL': parseCurrency(350),
                'VALOR DO DESCONTO': parseCurrency(tax.descount),
                'VALOR LÍQUIDO': parseCurrency(tax.total),
                'FORMA DE PAGAMENTO': formaPagamentoTaxaMatricula,
                'Vencimento': dataPagamentoTaxaMatricula,

                'DETALHAMENTO DAS PARCELAS': '\n',


                'Número de parcelas': parcelasTaxaMatricula,
                'Valor da parcela': parseCurrency(tax.taxes[0]?.valor),
                'Desconto por parcela': parseCurrency(tax.total / tax.taxes.length),


                'MATERIAL DIDÁTICO / PRODUTOS': '\n',

                'CAMPANHA': material?.campaign?.name ?? 'sem campanha',
                'DESCRIÇÃO DA CAMPANHA ': material?.campaign?.description ?? 'sem campanha',
                'MATERIAL DIDÁTICO': materialDidatico,
                'VALOR TOTAL': parseCurrency(material?.total) ?? 'sem campanha',
                'VALOR DO DESCONTO': parseCurrency(material?.descount) ?? 'sem campanha',
                'VALOR LÍQUIDO': parseCurrency(material?.total),
                'FORMA DE PAGAMENTO': formaPagamentoMaterialDidatico,
                'PRIMEIRO VENCIMENTO': vencimentoMaterialDidatico,

                'DETALHAMENTO DAS PARCELAS': '\n',

                'Número de parcelas': parcelasMaterial,
                'Valor da parcela': parseCurrency(material.materials[0]?.valor) ?? "Sem material",
                'Desconto por parcela': parseCurrency(material.descount / material.materials.length),
                'Valor líquido por parcela': parseCurrency(material.materials[0]?.valor) ?? "Sem material",


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


            const FinancialAccount = financialAccounts.find(fin => fin.nome.includes(financial_account[formaPagamentoTaxaMatricula]));
            const Categorie = categories.find(cat => cat.nome.includes("Taxa de Matrícula"));
            const CenterCost = costs.find(cos => cos.nome.includes("Taxa de Matrícula"));

            const itens = [{
                "descricao": "Taxa de Matrícula",
                "quantidade": 1,
                "valor": 350,
                "id": Unidade.includes("PTB") ?
                    "09a1a3f8-f75e-4b25-a2ce-e815514028de" : "682c4202-e0c2-4bab-a847-c8dbe89b80d9",
            }]

            const saleBody = {
                idCategorie: Categorie?.id,
                idCenterCost: CenterCost?.id,
                idFinancialAccount: FinancialAccount?.id,

                notes: saleNotes,
                idClient: persons.uuid,
                itens,
                payment: { total: 350, descount: tax.descount },
                dueDay: vencimentoMaterialDidatico,
                paymentType: paymentType[formaPagamentoMaterialDidatico],
                parcels: 1,

            }

            const newSale = await CreateSale({
                unity: Unidade,
                body: saleBody,
            })

            console.log("Taxa criada com sucesso")

            return res.status(201).json(newSale)

        } catch (error) {

            console.log({
                error,
                where: "[CREATE SALE TO CONTA AZUL]"

            })
            await SendSimpleWpp("marcos", process.env.MARCOS, JSON.stringify(`[CA:FEE]: ${error}`, null, 2))
            if ("errors" in error) return res.status(400).json({ message: error.errors })

            return res.status(400).json({ message: error })

        }
    }
}

export default new RegisterContaAzulController