# PROGRESS.md

Running log of what changed per phase during the Tobaki → Wasla migration, and anything left stubbed for later.

## Phase 1 — Brand + Domain Strip (see git log for full detail)
Brand renamed Tobaki→Wasla, age-gate deleted, vape SKU tables/admin screen dropped, ProductVariant collapsed to generic `label`, subscriptions shelved behind `NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=false`, terms/privacy rewritten for Egypt.

---

## Phase 2 — Schema Migration
- DB confirmed disposable (`neondb` on `ep-silent-frost-axbvo9ct-pooler`, a different endpoint than Phase 1's). Wiped the old (already-drifted) migration history and created a single fresh `20260728182822_init_wasla` migration from the current schema — no data preserved, per explicit instruction.
- Added `Product` fields: `unitType` (enum: PIECE/GRAM/KILOGRAM/LITER/MILLILITER/BUNDLE), `netWeight`, `sellByWeight`, `originRegion`, `isPerishable`, `shelfLifeDays`, `storage` (enum: AMBIENT/CHILLED/FROZEN), `isHeritageGood`.
- New models: `Address` (Egypt-shaped: governorate/district/street/building/floor/apartment/landmark/phone/lat/lng), `DeliveryZone` (AR/EN name, districts, base fee, ETA, active flag), `ShopZoneCoverage` (per-shop fee override/min order/cutoff time per zone), `DeliveryWaitlist` (captures out-of-zone visitors).
- `Order` gained: `orderGroupId` (nullable string, for splitting a multi-shop cart into per-shop orders sharing a group key), `addressId`/`zoneId` FKs, `deliveryFee`, `promisedEta`, `deliveryNotes`, `currency` (default "EGP"). Status default changed from `"pending"` to `"PLACED"` to match the new status flow (existing string-based status checks elsewhere still use lowercase values like `'delivered'` — **stub**: the full `PLACED → SHOP_CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED | CANCELLED` flow from the brief is not yet wired into order-status-changing code; that's Phase 4/7 work).
- Currency-suffixed fields renamed everywhere: `priceAed`→`price`, `totalAed`→`total`, `commissionAed`→`commission`, `budgetAed`→`budget`. All "AED" display text swapped to "EGP" (plain text swap, not real i18n currency formatting — that's Phase 6).
- **Deferred** (logged in DECISIONS.md): `SellerProfile`→`Shop` Prisma model/field rename. Too high blast-radius for continuous unattended execution; UI copy already says "Shop" from Phase 1.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅.

---
