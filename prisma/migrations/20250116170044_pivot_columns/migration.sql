/*
  Warnings:

  - Added the required column `color` to the `insume` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "insume" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;
