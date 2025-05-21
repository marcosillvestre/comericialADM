/*
  Warnings:

  - You are about to drop the column `contract` on the `files` table. All the data in the column will be lost.
  - Added the required column `registerId` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" DROP COLUMN "contract",
ADD COLUMN     "registerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
