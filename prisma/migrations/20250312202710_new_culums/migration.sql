-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "student" TEXT,
    "sku" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unity" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "arrived" BOOLEAN NOT NULL DEFAULT false,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "status" "situation" NOT NULL DEFAULT 'REVISAR',
    "removedBy" TEXT NOT NULL,
    "withdraw" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);
