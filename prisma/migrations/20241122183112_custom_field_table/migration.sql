/*
  Warnings:

  - You are about to drop the column `for` on the `customFields` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `customFields` table. All the data in the column will be lost.
  - The `options` column on the `customFields` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `name` to the `customFields` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `customFields` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "customFields" DROP COLUMN "for",
DROP COLUMN "label",
ADD COLUMN     "name" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "options",
ADD COLUMN     "options" TEXT[];
