-- CreateEnum
CREATE TYPE "situation" AS ENUM ('REVISAR', 'REVISADO', 'ENVIADO', 'CHEGOU', 'ENTREGUE', 'CANCELADO');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "student" TEXT,
    "sku" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "arrived" BOOLEAN NOT NULL DEFAULT false,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "status" "situation" NOT NULL DEFAULT 'REVISAR',
    "removedBy" TEXT NOT NULL,
    "withdraw" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
