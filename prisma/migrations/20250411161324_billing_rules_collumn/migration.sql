/*
  Warnings:

  - You are about to drop the column `remiderMethod` on the `billingRules` table. All the data in the column will be lost.
  - Added the required column `reminderMethod` to the `billingRules` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "billingRules" DROP COLUMN "remiderMethod",
ADD COLUMN     "reminderMethod" JSONB NOT NULL;
