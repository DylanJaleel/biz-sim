-- Boardroom ersetzt das Handwerksspiel: Alle Tabellen des alten Spielmodells
-- werden entfernt. Benutzerkonten bleiben bestehen, jeder startet beim
-- nächsten Besuch ein neues Spiel.

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_userId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_companyId_fkey";

-- DropForeignKey
ALTER TABLE "GameEvent" DROP CONSTRAINT "GameEvent_companyId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Round" DROP CONSTRAINT "Round_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_companyId_fkey";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "Employee";

-- DropTable
DROP TABLE "GameEvent";

-- DropTable
DROP TABLE "LedgerEntry";

-- DropTable
DROP TABLE "Loan";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "Round";

-- DropTable
DROP TABLE "Warehouse";

-- DropEnum
DROP TYPE "CompanyStatus";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "RoundStatus";

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "month" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_userId_key" ON "Game"("userId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

