-- AlterTable
ALTER TABLE "order" ADD COLUMN     "arrivingDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "delivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logs" JSONB[];
