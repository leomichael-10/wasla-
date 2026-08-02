-- AlterTable: internal-category flag
ALTER TABLE "Category" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: bilingual tagline + logo, additive first so we can backfill
-- before dropping the old single-language column.
ALTER TABLE "SellerProfile" ADD COLUMN "descriptionAr" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "logoUrl" TEXT;

-- Backfill: preserve existing taglines (e.g. لقمة حلوة's) into descriptionAr
-- before the old column is dropped.
UPDATE "SellerProfile" SET "descriptionAr" = "description" WHERE "description" IS NOT NULL;

ALTER TABLE "SellerProfile" DROP COLUMN "description";
