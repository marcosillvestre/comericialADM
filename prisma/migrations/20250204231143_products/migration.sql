-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "price_selling" DOUBLE PRECISION NOT NULL,
    "price_ticket" DOUBLE PRECISION NOT NULL,
    "price_card" DOUBLE PRECISION NOT NULL,
    "price_cash" DOUBLE PRECISION NOT NULL,
    "price_link" DOUBLE PRECISION NOT NULL,
    "category" "typeInsume" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "price_selling" DOUBLE PRECISION NOT NULL,
    "price_ticket" DOUBLE PRECISION NOT NULL,
    "price_card" DOUBLE PRECISION NOT NULL,
    "price_cash" DOUBLE PRECISION NOT NULL,
    "price_link" DOUBLE PRECISION NOT NULL,
    "category" "typeInsume" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);
