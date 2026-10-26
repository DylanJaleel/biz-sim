-- CreateTable
CREATE TABLE "DbUsage" (
    "month" TEXT NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "bytesRead" BIGINT NOT NULL DEFAULT 0,
    "bytesWritten" BIGINT NOT NULL DEFAULT 0,
    "queries" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DbUsage_pkey" PRIMARY KEY ("month")
);

