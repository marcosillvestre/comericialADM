-- CreateTable
CREATE TABLE "historic" (
    "id" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "information" JSONB NOT NULL,

    CONSTRAINT "historic_pkey" PRIMARY KEY ("id")
);
