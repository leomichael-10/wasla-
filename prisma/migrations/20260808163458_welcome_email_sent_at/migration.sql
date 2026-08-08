-- AlterTable: guard against duplicate welcome-email sends
ALTER TABLE "User" ADD COLUMN "welcomeEmailSentAt" TIMESTAMP(3);
