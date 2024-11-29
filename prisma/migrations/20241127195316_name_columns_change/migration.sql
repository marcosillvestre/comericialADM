/*
  Warnings:

  - You are about to drop the column `assinaturaContrato` on the `registers` table. All the data in the column will be lost.
  - You are about to drop the column `materialStatus` on the `registers` table. All the data in the column will be lost.
  - You are about to drop the column `paStatus` on the `registers` table. All the data in the column will be lost.
  - You are about to drop the column `pagamentoStatus` on the `registers` table. All the data in the column will be lost.
  - You are about to drop the column `responsavelADM` on the `registers` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CATEGORY" AS ENUM ('StatusMatricula', 'Observacoes', 'Contrato', 'Financeiro', 'InformacoesAlunoEResponsavel', 'Pedagogico', 'Outros');

-- AlterTable
ALTER TABLE "customFields" ADD COLUMN     "category" "CATEGORY" NOT NULL DEFAULT 'Outros';

-- AlterTable
ALTER TABLE "registers" DROP COLUMN "assinaturaContrato",
DROP COLUMN "materialStatus",
DROP COLUMN "paStatus",
DROP COLUMN "pagamentoStatus",
DROP COLUMN "responsavelADM",
ADD COLUMN     "admResponsavel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "assinaturaContratoStatus" TEXT NOT NULL DEFAULT 'pendente',
ADD COLUMN     "dataPagamentoMaterialDidatico" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "dataPagamentoPrimeiraParcela" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "dataPagamentoTaxaMatricula" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "materialDidaticoStatus" TEXT NOT NULL DEFAULT 'pendente',
ADD COLUMN     "pagamentoPrimeiraParcelaStatus" TEXT NOT NULL DEFAULT 'pendente',
ADD COLUMN     "primeiraAulaStatus" TEXT NOT NULL DEFAULT 'pendente';
