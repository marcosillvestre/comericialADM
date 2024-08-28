/*
  Warnings:

  - You are about to drop the column `customer` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Orders` table. All the data in the column will be lost.
  - Added the required column `code` to the `Orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "customer",
DROP COLUMN "order",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "orders" JSONB[];
