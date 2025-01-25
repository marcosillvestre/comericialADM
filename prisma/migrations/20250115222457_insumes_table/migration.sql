-- CreateTable
CREATE TABLE "insume" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price_selling" DOUBLE PRECISION NOT NULL,
    "price_ticket" DOUBLE PRECISION NOT NULL,
    "price_card" DOUBLE PRECISION NOT NULL,
    "price_cash" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insume_pkey" PRIMARY KEY ("id")
);
