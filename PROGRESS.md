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

## Phase 3 — Category Tree + Seed
- `scripts/seed.js` rewritten: 11 categories with AR/EN-worthy names (Arabic names not yet added to the `Category.name` field itself — schema only has one `name` string, no `nameAr`; **stub**: proper bilingual category names need a schema field, not just seed-script text — flagged for Phase 6) and matching subcategories per the brief's taxonomy table.
- 3 demo shops seeded (Kassala Coffee House in Faisal/Cairo, Ard El Lewa Sudanese Market in Ard El Lewa/Giza, Bayt Al Sudan Heritage Store in Nasr City/Cairo), all pre-approved (`approvedByAdmin: true`) so they're immediately visible.
- 27 demo products (~1 per subcategory) spread across all 11 categories with realistic EGP pricing, `unitType`/`sellByWeight`/`isPerishable`/`shelfLifeDays`/`storage`/`isHeritageGood`/`originRegion` set per product, and 1–3 variants each using the generic `label` field for pack size/clothing size.
- Demo data is flagged for wipe via `skuCode` prefix `DEMO-` (documented at the top of `scripts/seed.js`) — no schema field for this since adding one felt like overkill for a wipe-by-prefix need.
- Ran `npm run seed` against the disposable DB — succeeded (11 categories, 33 subcategories, 3 shops, 27 products).
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (seeding is data-only, no schema change).

---

## Phase 4 — Same-Day Cairo Delivery
- Seeded the 8 launch zones from the brief (Faisal, Haram, Ard El Lewa, 6th of October/Hosary, Nasr City, Ain Shams, Maadi, Hadayek El Maadi) with AR/EN names, base fee, and ETA minutes, plus `ShopZoneCoverage` rows wiring each of the 3 demo shops to 3 zones each (with one fee override and one min-order example) so the feature has real data to render against.
- **Zone gate**: `components/ZoneGate.js`, a client component mounted globally in `app/layout.js`. On first visit (no `wasla_zone` cookie) it shows a full-screen picker fetched from `/api/zones`; selecting a zone sets a 90-day cookie via `lib/zone.js`. Includes a waitlist form (`POST /api/waitlist` → `DeliveryWaitlist`) for out-of-zone visitors, both wired and public in `middleware.js`.
- **Delivery quote**: `GET /api/delivery/quote?zoneId=&sellerIds=` resolves per-shop fee (override or zone base), same-day/next-day ETA (via `lib/delivery.js`'s cutoff-time logic), and min-order-value, shared between the client-facing quote endpoint and server-side order validation so the fee/ETA logic isn't duplicated or spoofable.
- **Cart**: now reads the zone cookie, fetches a quote per shop present in the cart, shows a per-shop delivery-fee/ETA/min-order breakdown (or "لا يوصل لمنطقتك" if a shop doesn't cover the zone), blocks checkout until a zone is picked or an uncovered shop is removed, and — when a checkout spans more than one shop — generates a shared `orderGroupId` (`crypto.randomUUID()`) passed to each per-shop order.
- **Order creation** (`POST /api/orders`) now accepts `zoneId`/`orderGroupId`, re-validates shop coverage and minimum order value server-side (never trusts the client-supplied fee), and persists `deliveryFee`/`promisedEta`/`zoneId`/`orderGroupId` on the order.
- **Order status flow**: renamed the whole lifecycle from lowercase ad hoc strings (`pending/accepted/preparing/delivered/cancelled`) to the brief's `PLACED → SHOP_CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED | CANCELLED`, updating every consumer (dashboard orders/queue, customer order history, admin stats/commission aggregates, product review-eligibility check). `Subscription.status` and other unrelated `status` fields were deliberately left alone — only `Order.status` values changed.
- **Stub / not done**: product listing pages (`/browse`, `/products`, `/shops/[id]`) do **not yet** greyed-out/hide products from shops outside the selected zone — the `/api/delivery/quote` endpoint exists and could annotate listings, but wiring it into every listing page's query + UI treatment was deferred to keep Phase 4 landing; the cart-level gate (blocking checkout) is the enforced boundary today. Flagging this explicitly rather than silently shipping it half-done.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅.

---

## Phase 5 — Egypt Payments
- Built `PaymentProvider` as a real interface first (`lib/payments/PaymentProvider.js`: `initiate()`/`verify()`), with three concrete implementations registered in `lib/payments/index.js`:
  - **`cod.js`** — Cash on Delivery, the default, fully working end to end (this was already the only working path; now formalized behind the interface).
  - **`manualTransfer.js`** — InstaPay/Vodafone Cash. `POST /api/orders` sets `paymentStatus: 'PAYMENT_PENDING'` for this method; the customer then uploads a receipt via the new `POST /api/orders/[id]/receipt` (Cloudinary, same pattern as product photos, restricted to the order's own customer), and an admin confirms or rejects it via the new `PATCH /api/admin/orders/[id]/payment`, which moves the order to `paid` or back to `unpaid`. Wired into the cart's payment-method radio and a receipt-upload widget on the order-confirmation page.
  - **`paymob.js`** — genuinely stubbed, not faked: `isConfigured` checks for `PAYMOB_API_KEY`/`PAYMOB_INTEGRATION_ID`/`PAYMOB_IFRAME_ID` (added as blank placeholders to `.env.example`), and `initiate()`/`verify()` throw a clear `PROVIDER_NOT_CONFIGURED` error (surfaced as an HTTP 503) rather than silently no-op'ing. The real Paymob auth→order→payment-key→iframe-redirect flow is commented inline as the exact next steps once keys exist. **Hard-stop #2 applies here** — no Paymob credentials exist, and none were fabricated; the UI shows Paymob as "coming soon" and disabled.
- Added `Order.receiptUrl` (additive column, migration `20260728185942_phase5_payments`, applied via ordinary `migrate dev` since it's a pure addition, not a rename/drop).
- Every price already displays in EGP from Phase 2; did not build deeper currency-formatting infrastructure here (that's Phase 6's i18n territory).
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅.

---

## Phase 6 — Arabic-First i18n + RTL
- **Scoped down from "translate every string in every component"** — see DECISIONS.md. Built real infrastructure and translated the highest-traffic surfaces; did not mechanically translate all ~70 routes.
- `lib/i18n.js`: a `t(key, locale)` dictionary helper, Arabic as `DEFAULT_LOCALE`, a `wasla_locale` cookie read server-side in `app/layout.js` and `app/page.js`, and client-side via `getLocaleCookie()`/`setLocaleCookie()` in `Navbar.js`, `ZoneGate.js`, `app/cart/page.js`.
- `app/layout.js` now sets `<html lang dir>` from the cookie (`rtl`/`ar` by default, `ltr`/`en` when toggled) and loads the `Cairo` Arabic font via `next/font/google`, applied when locale is `ar`.
- Translated: root layout footer, `Navbar` (added an AR/EN toggle button, translated search placeholder, fixed the "toba<span>ki</span>" wordmark leftover from Phase 1's brand sed pass that split across a nested span and wasn't caught), the homepage hero section (tag/heading/subheading/search/feature badges), `ZoneGate`, and the cart summary (subtotal/delivery/total/checkout button).
- Egyptian phone validation: `lib/phone.js` (`isEgyptianPhone`, `normalizeDigits` for Arabic-Indic digit input), wired into `/register` and `/onboarding` phone fields with inline validation errors.
- **Not done**: dashboard, admin, and product-detail pages remain English-only; there is no locale-aware currency/number formatting beyond the flat "EGP" prefix from Phase 2/5. Flagging explicitly rather than claiming full RTL/i18n coverage.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change this phase).

---
