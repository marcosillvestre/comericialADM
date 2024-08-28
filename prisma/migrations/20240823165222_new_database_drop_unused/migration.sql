/*
  Warnings:

  - You are about to drop the `contracts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `servicesOrProducts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_userId_fkey";

-- DropForeignKey
ALTER TABLE "servicesOrProducts" DROP CONSTRAINT "servicesOrProducts_contractId_fkey";

-- DropTable
DROP TABLE "contracts";

-- DropTable
DROP TABLE "logs";

-- DropTable
DROP TABLE "servicesOrProducts";

-- DropEnum
DROP TYPE "TYPESERVICE";

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);
