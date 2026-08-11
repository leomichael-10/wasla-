-- AlterTable: track password changes so middleware.js can invalidate
-- already-issued JWTs (see app/api/auth/reset-password/route.js)
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
