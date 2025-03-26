-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "requestId" TEXT;

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "suplierID" TEXT NOT NULL,
    "codeRequest" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unityId" TEXT NOT NULL,
    "messageSent" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_suplierID_fkey" FOREIGN KEY ("suplierID") REFERENCES "supliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_unityId_fkey" FOREIGN KEY ("unityId") REFERENCES "unities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
