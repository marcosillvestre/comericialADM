/*
  Warnings:

  - You are about to drop the `Orders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Orders";

-- CreateTable
CREATE TABLE "registers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "aprovacaoADM" TEXT NOT NULL DEFAULT 'pendente',
    "pagamentoStatus" TEXT NOT NULL DEFAULT 'pendente',
    "taxaMatriculaStatus" TEXT NOT NULL DEFAULT 'pendente',
    "materialStatus" TEXT NOT NULL DEFAULT 'pendente',
    "responsavelADM" TEXT NOT NULL DEFAULT 'pendente',
    "aprovacaoDirecao" TEXT NOT NULL DEFAULT 'pendente',
    "comissaoStatus" TEXT NOT NULL DEFAULT 'pendente',
    "paStatus" TEXT NOT NULL DEFAULT 'pendente',
    "assinaturaContrato" TEXT NOT NULL DEFAULT 'pendente',
    "diretorResponsavel" TEXT NOT NULL DEFAULT '',
    "dataComissionamento" TEXT NOT NULL DEFAULT '',
    "dataMatricula" TEXT NOT NULL DEFAULT '',
    "dataValidacao" TEXT NOT NULL DEFAULT '',
    "customFields" JSONB[],
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
