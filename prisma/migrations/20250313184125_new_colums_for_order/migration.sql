-- CreateEnum
CREATE TYPE "logisticType" AS ENUM ('ENCOMENDA', 'REPOSICAO');

-- AlterEnum
ALTER TYPE "situation" ADD VALUE 'DISPONIVEL';

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "logistic" JSONB[],
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "type" "logisticType" NOT NULL DEFAULT 'ENCOMENDA';
