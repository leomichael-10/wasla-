-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('SHOP', 'RESTAURANT');

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "sellerType" "SellerType" NOT NULL DEFAULT 'SHOP';
