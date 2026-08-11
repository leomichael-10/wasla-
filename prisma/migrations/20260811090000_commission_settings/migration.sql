-- AlterTable: snapshot of the rate actually applied to this COMMISSION
-- row, so past ledger entries never recalculate when the platform rate
-- changes later. Null for TOPUP/ADJUSTMENT rows (they have no rate).
ALTER TABLE "WalletTransaction" ADD COLUMN     "commissionRate" DECIMAL(65,30);

-- CreateTable: append-only — a rate change INSERTs a new row rather than
-- updating one in place, so this table is its own audit log. The current
-- rate is always the most recent row.
CREATE TABLE "CommissionSetting" (
    "id" SERIAL NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER,

    CONSTRAINT "CommissionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionSetting_createdAt_idx" ON "CommissionSetting"("createdAt");

-- AddForeignKey
ALTER TABLE "CommissionSetting" ADD CONSTRAINT "CommissionSetting_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the baseline row so the table is never empty — matches the
-- previously-hardcoded COMMISSION_RATE = 0.05 in lib/wallet.js exactly,
-- so this migration changes no seller's actual charge on deploy.
INSERT INTO "CommissionSetting" ("rate", "createdAt", "updatedBy") VALUES (0.05, CURRENT_TIMESTAMP, NULL);
