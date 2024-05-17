-- CreateEnum
CREATE TYPE "TYPE" AS ENUM ('String', 'Number', 'Date', 'Select', 'MultiSelect');

-- CreateTable
CREATE TABLE "customFields" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TYPE" NOT NULL DEFAULT 'String',
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "options" JSONB,
    "for" TEXT NOT NULL,

    CONSTRAINT "customFields_pkey" PRIMARY KEY ("id")
);
