-- CreateEnum
CREATE TYPE "descountType" AS ENUM ('Percentage', 'Value');

-- CreateTable
CREATE TABLE "campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedParcels" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL,
    "descountType" "descountType" NOT NULL DEFAULT 'Percentage',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);
