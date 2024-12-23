/*
  Warnings:

  - You are about to drop the column `for` on the `customFields` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `customFields` table. All the data in the column will be lost.
  - The `options` column on the `customFields` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Orders` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `customFields` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `customFields` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CATEGORY" AS ENUM ('StatusMatricula', 'Observacoes', 'Contrato', 'Financeiro', 'InformacoesAlunoEResponsavel', 'Pedagogico', 'Outros');

-- AlterTable
ALTER TABLE "customFields" DROP COLUMN "for",
DROP COLUMN "label",
ADD COLUMN     "category" "CATEGORY" NOT NULL DEFAULT 'Outros',
ADD COLUMN     "name" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "options",
ADD COLUMN     "options" TEXT[];

-- DropTable
DROP TABLE "Orders";

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

-- AddForeignKey
ALTER TABLE "logHistoric" ADD CONSTRAINT "logHistoric_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
