/*
  Warnings:

  - You are about to drop the `books` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `weekOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "books" DROP CONSTRAINT "books_orderId_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "link" DROP NOT NULL;

-- DropTable
DROP TABLE "books";

-- DropTable
DROP TABLE "weekOrder";
