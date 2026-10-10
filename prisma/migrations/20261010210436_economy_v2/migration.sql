-- The economy was redesigned (hours-based capacity, open-ended play, team and
-- equipment progression), so saved games of the previous model cannot be carried
-- over. Their data is removed (child rows cascade); every player starts a fresh
-- business on the next visit. Accounts (User) are kept.
DELETE FROM "Company";

-- AlterEnum
BEGIN;
CREATE TYPE "CompanyStatus_new" AS ENUM ('ACTIVE', 'INSOLVENT');
ALTER TABLE "public"."Company" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Company" ALTER COLUMN "status" TYPE "CompanyStatus_new" USING ("status"::text::"CompanyStatus_new");
ALTER TYPE "CompanyStatus" RENAME TO "CompanyStatus_old";
ALTER TYPE "CompanyStatus_new" RENAME TO "CompanyStatus";
DROP TYPE "public"."CompanyStatus_old";
ALTER TABLE "Company" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_companyId_fkey";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "stage",
ADD COLUMN     "toolLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "vehicles" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "workshopLevel" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "weekNumber" SET DEFAULT 1,
ALTER COLUMN "reputation" SET DEFAULT 40,
ALTER COLUMN "reputation" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "productivityFactor",
DROP COLUMN "weeklyWage",
ADD COLUMN     "endsWeek" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "laborHours" INTEGER NOT NULL,
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "Milestone";

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_companyId_weekNumber_idx" ON "LedgerEntry"("companyId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GameEvent_companyId_weekNumber_key" ON "GameEvent"("companyId", "weekNumber");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

