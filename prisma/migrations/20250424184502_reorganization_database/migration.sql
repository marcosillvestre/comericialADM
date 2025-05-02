/*
  Warnings:

  - You are about to drop the column `createdAt` on the `files` table. All the data in the column will be lost.
  - You are about to drop the `order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `person` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `books` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `customFields` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `logHistoric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `login` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `unities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "books" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "customFields" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "files" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "logHistoric" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "login" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "unities" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "order";

-- DropTable
DROP TABLE "person";
