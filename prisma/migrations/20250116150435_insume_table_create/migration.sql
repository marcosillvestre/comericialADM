/*
  Warnings:

  - Added the required column `category` to the `insume` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "typeInsume" AS ENUM ('Product', 'Service');

-- AlterTable
ALTER TABLE "insume" ADD COLUMN     "category" "typeInsume" NOT NULL;
