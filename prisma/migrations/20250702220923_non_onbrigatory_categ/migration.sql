-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categorieID_fkey";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "categorieID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categorieID_fkey" FOREIGN KEY ("categorieID") REFERENCES "productCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
