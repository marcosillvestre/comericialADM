-- CreateEnum
CREATE TYPE "TYPE" AS ENUM ('String', 'Number', 'Date', 'Select', 'MultiSelect');

-- CreateEnum
CREATE TYPE "CATEGORY" AS ENUM ('StatusMatricula', 'Observacoes', 'Contrato', 'Financeiro', 'InformacoesAlunoEResponsavel', 'Pedagogico', 'Outros');

-- CreateTable
CREATE TABLE "conec" (
    "id" SERIAL NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,

    CONSTRAINT "conec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL,
    "unity" TEXT[],

    CONSTRAINT "login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "assinaturaContratoStatus" TEXT NOT NULL DEFAULT 'pendente',
    "taxaMatriculaStatus" TEXT NOT NULL DEFAULT 'pendente',
    "pagamentoPrimeiraParcelaStatus" TEXT NOT NULL DEFAULT 'pendente',
    "materialDidaticoStatus" TEXT NOT NULL DEFAULT 'pendente',
    "primeiraAulaStatus" TEXT NOT NULL DEFAULT 'pendente',
    "comissaoStatus" TEXT NOT NULL DEFAULT 'pendente',
    "aprovacaoADM" TEXT NOT NULL DEFAULT 'pendente',
    "aprovacaoDirecao" TEXT NOT NULL DEFAULT 'pendente',
    "dataMatricula" TEXT NOT NULL DEFAULT '',
    "dataValidacao" TEXT NOT NULL DEFAULT '',
    "dataComissionamento" TEXT NOT NULL DEFAULT '',
    "diretorResponsavel" TEXT NOT NULL DEFAULT '',
    "admResponsavel" TEXT NOT NULL DEFAULT '',
    "dataPagamentoTaxaMatricula" TEXT NOT NULL DEFAULT '',
    "dataPagamentoPrimeiraParcela" TEXT NOT NULL DEFAULT '',
    "dataPagamentoMaterialDidatico" TEXT NOT NULL DEFAULT '',
    "observacao" JSONB[],
    "customFields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logHistoric" (
    "id" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "information" JSONB NOT NULL,
    "registerId" TEXT NOT NULL,

    CONSTRAINT "logHistoric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person" (
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "aprovacaoADM" TEXT NOT NULL,
    "ppStatus" TEXT NOT NULL,
    "tmStatus" TEXT NOT NULL,
    "mdStatus" TEXT NOT NULL,
    "responsavelADM" TEXT NOT NULL,
    "aprovacaoDirecao" TEXT NOT NULL,
    "diretorResponsavel" TEXT NOT NULL,
    "comissaoStatus" TEXT NOT NULL,
    "paStatus" TEXT NOT NULL,
    "acStatus" TEXT NOT NULL,
    "aluno" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "contrato" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "subclasse" TEXT NOT NULL,
    "tmVencimento" TEXT NOT NULL,
    "tmValor" TEXT NOT NULL,
    "ppVencimento" TEXT NOT NULL,
    "mdValor" TEXT NOT NULL,
    "acFormato" TEXT NOT NULL,
    "tipoMatricula" TEXT NOT NULL,
    "tipoComissao" TEXT NOT NULL,
    "comissaoValor" TEXT NOT NULL,
    "paDATA" TEXT NOT NULL,
    "inicioContrato" TEXT NOT NULL,
    "fimContrato" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "Valor" DOUBLE PRECISION NOT NULL,
    "id" INTEGER NOT NULL,
    "situMatric" TEXT NOT NULL,
    "alunoNascimento" TEXT NOT NULL,
    "cargaHoraria" TEXT NOT NULL,
    "contratoStatus" TEXT NOT NULL,
    "dataComissionamento" TEXT NOT NULL,
    "dataMatricula" TEXT NOT NULL,
    "dataValidacao" TEXT NOT NULL,
    "formatoAula" TEXT NOT NULL,
    "horarioFim" TEXT NOT NULL,
    "horarioInicio" TEXT NOT NULL,
    "idadeAluno" TEXT NOT NULL,
    "materialDidatico" TEXT[],
    "mdData" TEXT NOT NULL,
    "mdDesconto" TEXT NOT NULL,
    "mdFormaPg" TEXT NOT NULL,
    "mdParcelas" TEXT NOT NULL,
    "mdVencimento" TEXT NOT NULL,
    "nivelamento" TEXT NOT NULL,
    "observacao" JSONB[],
    "ppData" TEXT NOT NULL,
    "ppDesconto" TEXT NOT NULL,
    "ppFormaPg" TEXT NOT NULL,
    "ppParcelas" TEXT NOT NULL,
    "ppValor" TEXT NOT NULL,
    "tempoContrato" TEXT NOT NULL,
    "tipoModalidade" TEXT NOT NULL,
    "tmData" TEXT NOT NULL,
    "tmDesconto" TEXT NOT NULL,
    "tmFormaPg" TEXT NOT NULL,
    "tmParcelas" TEXT NOT NULL,
    "dataAC" JSONB[],
    "diaAula" TEXT[],
    "professor" TEXT[],
    "curso" TEXT NOT NULL,

    CONSTRAINT "person_pkey" PRIMARY KEY ("contrato")
);

-- CreateTable
CREATE TABLE "unities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "unities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historic" (
    "id" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "information" JSONB NOT NULL,

    CONSTRAINT "historic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unity" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "tel" TEXT,
    "data" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "aluno" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "chegada" BOOLEAN NOT NULL DEFAULT false,
    "assinado" BOOLEAN NOT NULL DEFAULT false,
    "retiradoPor" TEXT NOT NULL,
    "dataRetirada" TEXT NOT NULL,
    "materialDidatico" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contract" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customFields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT[],
    "order" INTEGER NOT NULL,
    "category" "CATEGORY" NOT NULL DEFAULT 'Outros',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customFields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_email_key" ON "login"("email");

-- AddForeignKey
ALTER TABLE "logHistoric" ADD CONSTRAINT "logHistoric_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "weekOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
