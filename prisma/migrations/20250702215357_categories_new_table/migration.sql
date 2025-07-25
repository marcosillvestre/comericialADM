/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Kit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categorieID]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Kit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categorieID` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Kit" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "priceSale" DECIMAL(65,30) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "categorieID" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "productCategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productCategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productCategories_name_key" ON "productCategories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Kit_code_key" ON "Kit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_categorieID_key" ON "Product"("categorieID");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categorieID_fkey" FOREIGN KEY ("categorieID") REFERENCES "productCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
