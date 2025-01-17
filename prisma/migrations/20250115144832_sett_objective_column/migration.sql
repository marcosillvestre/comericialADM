/*
  Warnings:

  - Added the required column `for` to the `campaign` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "destiny" AS ENUM ('Parcel', 'Material', 'Tax');

-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "for" "destiny" NOT NULL;
