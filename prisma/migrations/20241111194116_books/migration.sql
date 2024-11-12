/*
  Warnings:

  - The `chegada` column on the `books` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `assinado` column on the `books` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `valor` on the `books` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "books" DROP COLUMN "valor",
ADD COLUMN     "valor" DOUBLE PRECISION NOT NULL,
DROP COLUMN "chegada",
ADD COLUMN     "chegada" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "assinado",
ADD COLUMN     "assinado" BOOLEAN NOT NULL DEFAULT false;
