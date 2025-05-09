-- AlterTable
ALTER TABLE "registers" ADD COLUMN     "documentos" TEXT NOT NULL DEFAULT 'Pendente',
ALTER COLUMN "assinaturaContratoStatus" SET DEFAULT 'Pendente',
ALTER COLUMN "taxaMatriculaStatus" SET DEFAULT 'Pendente',
ALTER COLUMN "pagamentoPrimeiraParcelaStatus" SET DEFAULT 'Pendente',
ALTER COLUMN "materialDidaticoStatus" SET DEFAULT 'Pendente',
ALTER COLUMN "primeiraAulaStatus" SET DEFAULT 'Pendente',
ALTER COLUMN "comissaoStatus" SET DEFAULT 'Pendente',
ALTER COLUMN "aprovacaoADM" SET DEFAULT 'Pendente',
ALTER COLUMN "aprovacaoDirecao" SET DEFAULT 'Pendente';
