/*
  Warnings:

  - You are about to drop the column `categorieID` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[categorieName]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categorieID_fkey";

-- DropIndex
DROP INDEX "Product_categorieID_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categorieID",
ADD COLUMN     "categorieName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_categorieName_key" ON "Product"("categorieName");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categorieName_fkey" FOREIGN KEY ("categorieName") REFERENCES "productCategories"("name") ON DELETE SET NULL ON UPDATE CASCADE;
