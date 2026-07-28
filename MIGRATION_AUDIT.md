# MIGRATION_AUDIT.md — Tobaki → Wasla

Audit only. No files were changed to produce this document. Repo root for the app is `tobaki/` (nested inside the outer folder); that inner directory is the actual git repository, currently on branch `main` with a clean working tree.

---

## 1. Route inventory

**Public marketing / shopping pages** (`app/`)
- `/` (home), `/browse`, `/products`, `/products/[id]`, `/shops`, `/shops/[id]`
- `/cart`, `/wishlist`, `/orders`, `/orders/confirmation`
- `/login`, `/register`, `/auth/redirect`, `/onboarding`
- `/profile`
- `/age-verification` — **vape-specific, to be deleted (Phase 1)**
- `/terms`, `/privacy` — vape-specific legal copy, needs full rewrite (Phase 8)

**Retailer/seller dashboard** (`app/dashboard/`)
- `/dashboard` (home), `/dashboard/orders`, `/dashboard/earnings`, `/dashboard/pixel`
- `/dashboard/products`, `/dashboard/products/add`, `/dashboard/products/[id]/edit`, `/dashboard/products/[id]/stock`
- `dashboard/layout.js` wraps all of the above

**Admin** (`app/admin/`)
- Single `/admin` page, backed by a large API surface under `app/api/admin/*`: categories, subcategories, commission, master-products, product-requests, products, retailer-products, sellers (+approve, +subscription), sku-catalogue, stats, subscriptions, traffic, users

**API routes** (`app/api/`) — grouped by domain:
- Auth: `auth/[...nextauth]`, `auth/login`, `auth/register`, `auth/me`, `auth/token`, `auth/verify-age` (**vape-specific**)
- Catalog: `categories`, `products`, `products/[id]`, `products/[id]/stock`
- Seller-side: `seller/catalog`, `seller/pixel`, `seller/pixel/stats`, `seller/product-requests`, `seller/products`, `seller/products/[id]`, `seller/retailer-products`, `seller/retailer-products/[id]`
- Shops: `shops`, `shops/[id]`
- Orders/reviews/wishlist/profile/onboarding/subscriptions
- Tracking: `track/global`, `track/pixel/[pixelId]`
- Upload: `upload` (Cloudinary)

No `/api/customer/*` routes actually exist yet even though `middleware.js` reserves a role-restriction entry for that prefix — harmless dead config, not a blocker.

---

## 2. Prisma schema — model list and relations

Core (domain-agnostic, keep as-is structurally):
- `User` (1:1 `CustomerProfile`, `SellerProfile`; 1:many `Order`, `Review`, `Wishlist`) — has `ageVerified Boolean` (**vape-specific field to remove**)
- `CustomerProfile` (belongs to `User`)
- `SellerProfile` — this is the de facto "Vendor/Retailer" model the migration brief calls `Shop`. Holds business profile, location, delivery flags, subscription status. 1:many `Product`, `Order`, `Review`, `AdCampaign`, `StockMovement`, `Subscription`, `RetailerProduct`, `ProductRequest`; 1:1 `TrackingPixel`
- `Subscription` (belongs to `SellerProfile`) — `priceAed` field name is currency-specific, needs rename/rework for EGP
- `Category` → `SubCategory` → `Product` (categorization tree, keep structurally, replace taxonomy content in Phase 3)
- `Product` — per-shop listing. Has `ProductVariant[]` (**variant model is vape-specific**, see below)
- `ProductVariant` — **vape-specific fields**: `flavor`, `nicotineLevel`, `sizeMl`, `puffCount`, `resistanceOhm`. Also holds `priceAed`, `stockQty`, `skuCode`, `image` — these are domain-neutral and should survive as the base of the new unit/pricing fields the brief wants added directly on `Product`/variant.
- `Order` → `OrderItem` — `totalAed`, `commissionAed`, `deliveryAddress` (plain string, needs to become the structured `Address` model), `paymentMethod`/`paymentStatus` (strings, ready to host new provider values)
- `Review`, `Wishlist`, `AdCampaign` → `AdStat`, `TrackingPixel` → `PixelEvent`, `GlobalEvent`, `StockMovement` — all domain-neutral, keep
- `MasterProduct` + `RetailerProduct` — **this is exactly the canonical-catalog/per-shop-listing split the brief highlights as Wasla's key structural advantage.** Already implemented, already keyed off `SellerProfile` (renaming target `Shop`). This is the strongest reason the "don't rewrite architecture" premise holds.
- `ProductRequest` — retailer requests to add SKUs to master catalog, domain-neutral
- **Vape-only lookup tables, no relations to anything else, safe to drop wholesale**: `Vape`, `Sparepart`, `Dokha`, `Cigarette`, `Disposable` — these back the `/api/admin/sku-catalogue` route and were seeded from `prisma/disposables.json` (392 lines) via migrations `20260530000000_add_sku_tables` and `20260530000002_add_disposable`.

Migrations present: `20260412190125_init`, `20260530000000_add_sku_tables`, `20260530000001_unique_category_master_product_name`, `20260530000002_add_disposable`.

---

## 3. Vape-domain concept hits

Grep for `vape|nicotine|eliquid|coil|ohm|pod|puff|PG/VG|18+|tobacco|smoke` (case-insensitive) matched 35 files. Breakdown:

- **Schema/data**: `prisma/schema.prisma` (`ProductVariant.flavor/nicotineLevel/sizeMl/puffCount/resistanceOhm`, plus the `Vape/Sparepart/Dokha/Cigarette/Disposable` models), `prisma/disposables.json`, `prisma/seed.mjs`, `scripts/seed.js`, two migration SQL files.
- **Age gate**: `app/age-verification/page.js` (full 21+ interstitial with hardcoded "tobacco and nicotine" copy), `app/api/auth/verify-age/route.js` (sets `User.ageVerified`), `User.ageVerified` referenced in `lib/authOptions.js` (Google sign-in auto-sets it true), `app/api/auth/register/route.js`, `app/api/auth/me/route.js`, `app/api/profile/route.js`, `app/api/admin/users/route.js`, `app/api/admin/stats/route.js`.
- **Nicotine-specific UI/logic**: `components/MasterProductForm.js` (hardcoded `NICOTINE_TYPES = ['Disposable','E-Liquid']`, a `NicotineWarning` component, nicotine strength suggestions like `20mg/50mg`), `lib/cart.js` (cart item shape comment references `flavor, nicotineLevel, puffCount`), `components/ProductCard.js`, `components/CategoryCard.js` (display vape attributes).
- **Brand/legal copy carrying the vape framing**: `app/layout.js` (footer disclaimer "For adults 21+ only. Vaping products contain nicotine..."), `app/terms/page.js`, `app/register/page.js`, `app/onboarding/page.js`, `app/orders/page.js`, `app/cart/page.js`, `app/page.js` (homepage), `app/dashboard/products/add/page.js`, `app/dashboard/products/[id]/edit/page.js`, `app/dashboard/products/[id]/stock/page.js`, `app/products/[id]/page.js`, `lib/emailTemplates.js`.
- Note: `app/admin/page.js` and `app/api/admin/sku-catalogue/route.js` both drive the vape SKU-catalogue admin screen end to end — this entire feature (route + page + the four lookup models) should be deleted in Phase 1, not just its data.

---

## 4. Brand string ("Tobaki") + env/metadata/OG carrying the brand

35+ files contain "Tobaki" (case-insensitive), concentrated in:
- **Metadata/SEO**: `app/layout.js` (page `<title>`, OG title/siteName, footer copyright, footer tagline "UAE Vape Marketplace")
- **Auth/cookies**: `tobaki_user_info` cookie name (`app/layout.js`), `tobaki_token` localStorage key (used across many components — `components/MasterProductForm.js` and others), `lib/UserContext.js`
- **Env vars**: `.env.example` → `DATABASE_URL` default db name `tobaki`, `NEXT_PUBLIC_APP_URL="https://tobaki.ae"`
- **package.json**: `"name": "tobaki"`
- **README.md**, `app/register/page.js`, `app/login/page.js` (implied branding), `app/terms/page.js`, `app/privacy/page.js`, most dashboard pages, `app/api/subscriptions/route.js`, `app/api/admin/subscriptions/[id]/route.js`, `lib/emailTemplates.js` (transactional email branding)
- No dedicated OG image files were found in `public/` — only generic Next.js/Vercel placeholder SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`). No brand logo asset exists yet to swap.

---

## 5. Payment integrations

**There is no third-party payment gateway wired up today.** No Stripe, Paymob, or similar SDK in `package.json` dependencies, and no matching code found beyond the string "payment" appearing as part of field names:
- `Order.paymentMethod` / `Order.paymentStatus` (free-text strings, default `"unpaid"`)
- `SellerProfile.subscriptionStatus`, `Subscription.paymentMethod`/`paymentStatus` for the seller subscription-fee flow

This means **Phase 5 is greenfield, not a rip-and-replace** — there's no gateway to remove, just a `paymentMethod` string field to formalize behind the requested `PaymentProvider` interface, and COD/Paymob/manual-transfer to build fresh.

---

## 6. Things that will break under the new model, with recommended fixes

| Issue | Why it breaks under Wasla | Recommended fix |
|---|---|---|
| `ProductVariant` schema is vape-shaped (`flavor`, `nicotineLevel`, `sizeMl`, `puffCount`, `resistanceOhm`) | These fields are meaningless for food/heritage goods and will show up empty in every dashboard form and product page | Additive migration: keep `ProductVariant` as the SKU/pricing/stock row, drop the vape-only columns, add the brief's new `Product`-level fields (`unitType`, `netWeight`, `sellByWeight`, `originRegion`, `isPerishable`, `shelfLifeDays`, `storage`, `isHeritageGood`) in Phase 2 |
| `User.ageVerified`, `/age-verification` page, `verify-age` route, Google sign-in auto-setting `ageVerified: true` | No age restriction applies to a grocery/heritage marketplace; keeping this implies false legal framing | Delete the field, page, route, and all references (Phase 1, non-negotiable #2) |
| Four vape lookup tables (`Vape`, `Sparepart`, `Dokha`, `Cigarette`, `Disposable`) + their admin UI + `disposables.json` seed | Entirely vape-specific, unrelated to master-catalog/shop-listing model already in place | Drop tables via migration, delete `app/admin` sku-catalogue route/page, delete `prisma/disposables.json` (Phase 1/2) |
| Currency-suffixed field names (`priceAed`, `totalAed`, `commissionAed`, `budgetAed`) throughout `Product`/`ProductVariant`... wait, actually on `Subscription`, `Order`, `AdCampaign`, and `RetailerProduct`/`MasterProduct` (`priceMin`/`priceMax` are currency-agnostic already) | Values will now be EGP, not AED; leaving `Aed` in the name is misleading (not a hard break, but a real footgun for whoever reads this code next) | Recommend a rename migration `priceAed → price`, `totalAed → total`, etc., in Phase 2, or at minimum a loud comment/rename to `priceEgp` — decide before writing the Phase 2 migration since it touches every model that carries money |
| `Order.deliveryAddress` is a plain `String` | Brief requires structured Egypt-shaped addresses (governorate/district/street/building/floor/apartment/landmark) tied to delivery zones | New `Address` model + `Order.addressId` FK, migrate existing string values into a best-effort `Address` row rather than dropping them (Phase 2) |
| No `DeliveryZone`/`ShopZoneCoverage` concept exists anywhere | Same-day Cairo zone gating (Phase 4) has nothing to attach to today | New models per the brief; `SellerProfile` (future `Shop`) already has `latitude`/`longitude`/`area`/`city` fields that can seed initial zone coverage, not a from-scratch effort |
| `Order` has one `sellerId`, i.e. one shop per order | Brief requires splitting a multi-shop cart into one order per shop sharing an `orderGroupId` | Additive `orderGroupId` column on `Order` (nullable, group key), checkout logic groups cart items by `sellerId` before insert — existing single-seller orders keep `orderGroupId = id` or null, no destructive change needed |
| Hardcoded `21+`/nicotine copy in `app/layout.js`, `app/terms`, transactional emails (`lib/emailTemplates.js`) | Wrong legal framing for a food business; also blocks Phase 6 Arabic-first rewrite from having a clean slate | Full rewrite in Phase 8 as specified, but flag now so Phase 1's "delete tobacco compliance logic" doesn't miss the footer/terms/email copy tucked outside the obviously-named files |
| `app/layout.js` sets `lang="en"` unconditionally, no `dir` attribute at all | Phase 6 requires `dir="rtl"` default — there is currently zero RTL/locale scaffolding (no i18n library, no locale routing) | This is a from-scratch build in Phase 6, not a toggle — plan for meaningful effort there, likely `next-intl` or hand-rolled dictionary + `dir="rtl"` on `<html>` |
| `SellerProfile.subscriptionStatus`/`Subscription` model assumes a paid-seller-subscription business model | Not mentioned anywhere in the Wasla brief — unclear if Wasla keeps a shop subscription fee | **Ambiguous — will ask before Phase 2** whether to keep, repurpose, or shelve the subscription/commission monetization model as-is |
| `app/dashboard/pixel` + `TrackingPixel`/`PixelEvent`/`AdCampaign`/`AdStat` (seller ad tracking + FB-pixel-style tracking) | Domain-neutral but Sudanese small shops in Cairo are unlikely to run ad campaigns via this system in v1 | Not called out in the brief either way — recommend leaving code in place (no user-facing harm) rather than spending Phase 1/8 effort removing a working, unrelated feature |

---

## 7. Security/hygiene issues found incidentally (unrelated to the rebrand, flagging because they're real)

- **`.env.example` contains what appear to be live-looking SMTP credentials** (`SMTP_USER="MICHEAL.FADI@GMAIL.COM"`, `SMTP_PASS="rpia xabk zdno hfny"` — a Gmail app-password shaped value), not placeholders. This file is almost certainly committed to git history. Recommend rotating that Gmail app password and scrubbing the example file to real placeholders — independent of the Wasla migration, but worth doing now while touching env/config files in Phase 1.
- `lib/authOptions.js` line 1 has a stray `console.log('GOOGLE SECRET LAST 4:', process.env.GOOGLE_CLIENT_SECRET?.slice(-4))` at module scope — leaks partial OAuth secret to logs on every cold start. Harmless-looking but should be deleted.

I did not rotate or edit anything — flagging both for your call.

---

## Summary judgment

The non-negotiable premise holds: **the master-catalog/shop-listing split, the role-based dashboard, categorization tree, order/review/wishlist models, media upload, and auth are all already domain-agnostic and need renaming, not rewriting.** The vape-specific surface area is well-contained — one variant sub-schema, four standalone lookup tables, one age-gate feature, and scattered copy/metadata strings — nothing structural stands in the way of Phase 1–2 as scoped.

Two things need your decision before I touch schema (Phase 2):
1. Keep, repurpose, or shelve the `Subscription`/`subscriptionStatus`/commission monetization model for Wasla shops?
2. Rename currency-suffixed fields (`priceAed`, `totalAed`, `commissionAed`, `budgetAed`) to currency-neutral names now, or defer that rename to a later cleanup pass?

Waiting for your approval to proceed to Phase 1.
