-- CreateTable
CREATE TABLE "weekOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unity" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Books" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aluno" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "chegada" TEXT NOT NULL,
    "assinado" TEXT NOT NULL,
    "retiradoPor" TEXT NOT NULL,
    "dataRetirada" TEXT NOT NULL,
    "materialDidatico" TEXT[],
    "orderId" TEXT NOT NULL,

    CONSTRAINT "Books_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Books" ADD CONSTRAINT "Books_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "weekOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
