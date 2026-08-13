-- AlterTable: optional English product name alongside the existing
-- (now-Arabic) `name` column. Nullable, additive — no backfill needed,
-- existing rows keep their current `name` value unchanged.
ALTER TABLE "Product" ADD COLUMN "nameEn" TEXT;
