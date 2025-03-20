-- AlterTable
ALTER TABLE "order" ALTER COLUMN "arrivingDate" DROP DEFAULT;

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "student" TEXT,
    "sku" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unity" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "arrived" BOOLEAN NOT NULL DEFAULT false,
    "arrivingDate" TIMESTAMP(3) NOT NULL,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "delivery" BOOLEAN NOT NULL DEFAULT false,
    "withdraw" TIMESTAMP(3) NOT NULL,
    "removedBy" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "status" "situation" NOT NULL DEFAULT 'REVISAR',
    "type" "logisticType" NOT NULL DEFAULT 'ENCOMENDA',
    "tags" TEXT[],
    "logistic" JSONB[],
    "logs" JSONB[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
