-- CreateEnum
CREATE TYPE "TriggerMoment" AS ENUM ('BEFORE', 'AT', 'AFTER');

-- CreateTable
CREATE TABLE "billingRules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "remiderMethod" JSONB NOT NULL,
    "daysToAction" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "typeTrigger" "TriggerMoment" NOT NULL,
    "category" "typeInsume" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "billingRules_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "_billingRulesToproducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_billingRulesToproducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_billingRulesToservices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_billingRulesToservices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_billingRulesToproducts_B_index" ON "_billingRulesToproducts"("B");

-- CreateIndex
CREATE INDEX "_billingRulesToservices_B_index" ON "_billingRulesToservices"("B");

-- AddForeignKey
ALTER TABLE "_billingRulesToproducts" ADD CONSTRAINT "_billingRulesToproducts_A_fkey" FOREIGN KEY ("A") REFERENCES "billingRules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_billingRulesToproducts" ADD CONSTRAINT "_billingRulesToproducts_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_billingRulesToservices" ADD CONSTRAINT "_billingRulesToservices_A_fkey" FOREIGN KEY ("A") REFERENCES "billingRules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_billingRulesToservices" ADD CONSTRAINT "_billingRulesToservices_B_fkey" FOREIGN KEY ("B") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
