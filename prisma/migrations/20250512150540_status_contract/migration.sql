-- CreateEnum
CREATE TYPE "registerStates" AS ENUM ('ATIVO', 'INATIVO', 'TRANCADO', 'RESCINDIDO', 'CANCELADO', 'PREMATRICULADO');

-- AlterTable
ALTER TABLE "registers" ADD COLUMN     "situacaoContrato" "registerStates" NOT NULL DEFAULT 'ATIVO';
