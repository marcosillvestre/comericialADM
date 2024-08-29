/*
  Warnings:

  - Added the required column `unity` to the `Orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "unity" TEXT NOT NULL;
