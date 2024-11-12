/*
  Warnings:

  - You are about to drop the column `type` on the `books` table. All the data in the column will be lost.
  - You are about to drop the `files` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "books" DROP COLUMN "type",
ALTER COLUMN "tel" DROP NOT NULL,
ALTER COLUMN "aluno" DROP NOT NULL,
ALTER COLUMN "materialDidatico" SET NOT NULL,
ALTER COLUMN "materialDidatico" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "files";
