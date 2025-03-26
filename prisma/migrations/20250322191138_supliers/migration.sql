-- CreateEnum
CREATE TYPE "supliersType" AS ENUM ('FISICO', 'JURIDICO');

-- CreateTable
CREATE TABLE "supliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docment" TEXT NOT NULL,
    "type" "supliersType" NOT NULL DEFAULT 'JURIDICO',
    "contacts" JSONB NOT NULL,
    "address" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supliers_docment_key" ON "supliers"("docment");
