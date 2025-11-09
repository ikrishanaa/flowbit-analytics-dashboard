-- CreateTable
CREATE TABLE "QueryLog" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL,
    "sql" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryLog_pkey" PRIMARY KEY ("id")
);
