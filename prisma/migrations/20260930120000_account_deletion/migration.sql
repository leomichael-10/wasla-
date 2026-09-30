-- Purely additive: one nullable column, no data touched.
--
-- Supports in-app account deletion (App Store 5.1.1(v) / Play Store
-- requirement). Accounts are never hard-deleted — Order, OrderItem, and
-- WalletTransaction rows reference User/SellerProfile and must survive
-- (a shop's sales history and commission ledger, not the customer's to
-- erase) — deletion instead anonymizes the row in place and sets this
-- column. middleware.js and the login route both reject any request
-- from a row with deletedAt set, even if a still-valid JWT exists.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
