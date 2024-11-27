/*
  Warnings:

  - Changed the type of `customFields` on the `registers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "registers" DROP COLUMN "customFields",
ADD COLUMN     "customFields" JSONB NOT NULL;
