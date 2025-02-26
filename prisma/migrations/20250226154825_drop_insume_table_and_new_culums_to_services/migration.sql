/*
  Warnings:

  - You are about to drop the `insume` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `course` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modality` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workLoad` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "course" TEXT NOT NULL,
ADD COLUMN     "modality" TEXT NOT NULL,
ADD COLUMN     "workLoad" TEXT NOT NULL;

-- DropTable
DROP TABLE "insume";
