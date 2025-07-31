/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categorieName_fkey";

-- DropForeignKey
ALTER TABLE "_KitToProduct" DROP CONSTRAINT "_KitToProduct_B_fkey";

-- DropTable
DROP TABLE "Product";

-- CreateTable
CREATE TABLE "newProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "priceSale" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "priceCost" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "ean" TEXT,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categorieName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" "typeInsume" NOT NULL,
    "workLoad" TEXT NOT NULL,
    "description" TEXT,
    "priceSale" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "priceCost" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "modality" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newBillingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reminderMethod" JSONB NOT NULL,
    "daysToAction" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "typeTrigger" "TriggerMoment" NOT NULL,
    "category" "typeInsume" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newBillingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductTobillings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductTobillings_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ServiceTobillings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ServiceTobillings_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "newProduct_name_key" ON "newProduct"("name");

-- CreateIndex
CREATE UNIQUE INDEX "newProduct_code_key" ON "newProduct"("code");

-- CreateIndex
CREATE UNIQUE INDEX "newProduct_ean_key" ON "newProduct"("ean");

-- CreateIndex
CREATE INDEX "_ProductTobillings_B_index" ON "_ProductTobillings"("B");

-- CreateIndex
CREATE INDEX "_ServiceTobillings_B_index" ON "_ServiceTobillings"("B");

-- AddForeignKey
ALTER TABLE "newProduct" ADD CONSTRAINT "newProduct_categorieName_fkey" FOREIGN KEY ("categorieName") REFERENCES "productCategories"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KitToProduct" ADD CONSTRAINT "_KitToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "newProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductTobillings" ADD CONSTRAINT "_ProductTobillings_A_fkey" FOREIGN KEY ("A") REFERENCES "newProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductTobillings" ADD CONSTRAINT "_ProductTobillings_B_fkey" FOREIGN KEY ("B") REFERENCES "newBillingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceTobillings" ADD CONSTRAINT "_ServiceTobillings_A_fkey" FOREIGN KEY ("A") REFERENCES "newService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceTobillings" ADD CONSTRAINT "_ServiceTobillings_B_fkey" FOREIGN KEY ("B") REFERENCES "newBillingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
