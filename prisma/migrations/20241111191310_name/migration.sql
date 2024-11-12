/*
  Warnings:

  - You are about to drop the `Books` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Books" DROP CONSTRAINT "Books_orderId_fkey";

-- DropTable
DROP TABLE "Books";

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aluno" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "chegada" TEXT NOT NULL,
    "assinado" TEXT NOT NULL,
    "retiradoPor" TEXT NOT NULL,
    "dataRetirada" TEXT NOT NULL,
    "materialDidatico" TEXT[],
    "orderId" TEXT NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "weekOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
