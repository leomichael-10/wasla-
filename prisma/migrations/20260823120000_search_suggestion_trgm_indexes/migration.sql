-- Purely additive: enables a Postgres extension and adds indexes. No
-- tables, columns, or rows are touched.
--
-- GET /api/search/suggestions (the header autocomplete dropdown) and the
-- existing GET /api/products search both filter with Prisma's
-- `contains` + `mode: 'insensitive'`, which compiles to `ILIKE '%term%'`.
-- A standard B-tree index can't accelerate a leading-wildcard ILIKE scan,
-- so as the catalog grows this would fall back to a sequential scan on
-- every keystroke. pg_trgm's trigram GIN indexes accelerate ILIKE for
-- both `%term%` and `term%` patterns without changing how the columns are
-- queried.
--
-- Not mirrored in prisma/schema.prisma: representing a GIN index with a
-- non-default operator class (gin_trgm_ops) requires enabling Prisma's
-- `postgresqlExtensions` preview feature, which is a generator-wide
-- config change with its own risk surface. Prisma Client doesn't read
-- index metadata at query time either way, so the app works identically
-- with or without the schema-level declaration — only `prisma migrate
-- diff` loses visibility into these three indexes specifically. Judged
-- to be the safer tradeoff than adopting a preview feature for this.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Product_nameEn_trgm_idx"
  ON "Product" USING GIN ("nameEn" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "SellerProfile_businessName_trgm_idx"
  ON "SellerProfile" USING GIN ("businessName" gin_trgm_ops);
