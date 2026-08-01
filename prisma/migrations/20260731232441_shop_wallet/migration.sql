-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('TOPUP', 'COMMISSION', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "walletBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "orderId" INTEGER,
    "note" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTransaction_shopId_createdAt_idx" ON "WalletTransaction"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_orderId_shopId_type_key" ON "WalletTransaction"("orderId", "shopId", "type");

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
