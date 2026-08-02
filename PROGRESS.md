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

## Phase 7 — Shop Dashboard
- **Catalog claiming** (claim products from master catalog, set own price/stock) already existed pre-migration via `RetailerProduct` + `/dashboard/catalog` + `/api/seller/retailer-products` — no changes needed there, confirmed still functional after the currency/status renames.
- **Zone coverage self-service**: new `GET/POST /api/seller/zone-coverage` (list every active zone annotated with this shop's coverage; upsert a zone's `isActive`/`feeOverride`/`minOrderValue`/`cutoffTime`) and a new `/dashboard/settings` page (added to the dashboard nav) rendering a toggle + fee/min-order/cutoff-time inputs per zone. This is shop self-service on top of the `ShopZoneCoverage` rows an admin or the Phase 4 seed already created.
- **Open/closed toggle**: added `SellerProfile.isOpen` (additive column, migration `20260728191314_phase7_shop_open_toggle`, default `true`), `GET/PATCH /api/seller/profile`, and a status card at the top of `/dashboard/settings`. Closing a shop does **not** delete or deactivate its products — it's filtered out of general browse/homepage listings (`isOpen: true` added to the same where-clauses that already filtered on `subscriptionStatus`/`approvedByAdmin`, so this follows an existing pattern rather than inventing a new one) while still reachable directly via its shop page or product page, where `ProductCard` now shows "Shop Closed" and disables Add to Cart instead of hiding the listing outright.
- **Order queue new-order indicator**: `/dashboard/orders` now polls `/api/orders` every 20s, diffs the `PLACED`-status order IDs against what it already knew about, and on a genuinely new order plays a short two-tone Web Audio chime (no asset file — synthesized oscillator) plus shows a dismissible pulsing "New order" badge next to the page title. Not real-time (no WebSocket/SSE) — 20s polling was the pragmatic choice here.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅.

---

## Phase 8 — Cleanup
- Expanded `app/terms/page.js` with a dedicated food-safety disclaimer section (shops solely responsible for sourcing/handling/shelf-life; allergy guidance; how to report a concern).
- Added `app/sitemap.js` (static routes + all active products from open shops + all approved+open shops) and `app/robots.js` (disallow `/dashboard`, `/admin`, `/api`).
- Added Product/GroceryStore JSON-LD structured data to `app/products/[id]/page.js` and `app/shops/[id]/page.js`.
- Dead-code sweep: fixed two leftover vape-era placeholder strings ("Elf Bar") in `app/dashboard/products/add/page.js`, and the stale `"tobaki"` package name in `package-lock.json`.
- Rewrote `README.md` — it was still 100% untouched `create-next-app` boilerplate (with a stray literal `#tobaki` heading from a shell-escaping accident) through every prior phase.
- Wrote `MIGRATION_REPORT.md` — final summary of what changed per phase, what's stubbed, and what you need to supply.
- Gate: `npm run build` ✅ (sitemap.xml/robots.txt now compile as static routes), `prisma migrate diff --exit-code` reports no difference ✅ (no schema change this phase).

---

**End of Phase 2–8 continuous execution.** See MIGRATION_REPORT.md for the consolidated summary.

## Task 1 (post-migration fix) — Zone gate modal stuck
- **Root cause**: `DeliveryZone` rows exist (verified 8 active zones in the DB — seed was fine), so the reported "no zone options" wasn't missing data. The real bugs were in `components/ZoneGate.js`: (1) the fetch error path (`.catch(() => {})`) silently swallowed failures, leaving `zones=[]`/`loading=false` with no distinction from "zero zones exist" and no way to recover; (2) there was no explicit close/skip control, so a failed or empty load left the modal permanently blocking the app; (3) the waitlist "thanks" block and the zone list were separate always-rendered sections rather than mutually exclusive views, which is consistent with the reported "waitlist confirmation shown at the same time as no zone options" if `view`-equivalent state ever desynced.
- **Fix**: rewrote the component around one explicit `view` state (`'loading' | 'zones' | 'error' | 'waitlist-thanks'`) so exactly one is ever rendered. Added a real error view with a Retry button. Added a dismissible close (×) button (`handleSkip`) so the modal can never trap the app regardless of load outcome. The waitlist "thanks" message now only renders after `handleWaitlist` actually succeeds, not on initial mount.
- **RTL fix**: the modal's outer container now sets `dir` from the locale cookie; zone buttons show the locale-primary name first (Arabic name first when `locale==='ar'`) with the secondary name using logical `ms-2` spacing instead of a hardcoded `ml-2`; the close button uses logical `inset-e-4` positioning; all copy in the waitlist/error sections is now bilingual (previously hardcoded English-only strings inside an otherwise-translated component).
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change).

---

## Task 2 — "Add to Home Screen" PWA install
- **Scoping call** (logged in DECISIONS.md): hand-rolled a real service worker + manifest instead of pulling in `next-pwa`/`serwist`. This app runs Next.js 16.2.3 (very recent); a build-time PWA plugin's compatibility can't be confirmed here without a full device/browser test matrix, so a plugin failure would be a silent risk. The hand-rolled `public/sw.js` is a real, working service worker (cache-first for static assets/icons, network-first-with-cache-fallback for pages, API requests always bypass the cache) — not a stub — and can be swapped for a plugin-based precaching strategy later without restructuring anything.
- `public/manifest.webmanifest`: name/short_name, Arabic `lang`/`dir` by default, standalone display, theme color matching the purple brand, `any` + `maskable` icon sets.
- **Icons**: generated real PNGs (192/512, plus a padded maskable variant, plus an iOS apple-touch-icon) from a placeholder "W" wordmark SVG, rasterized via `sharp` (already a transitive Next.js dependency — no new install needed). These are placeholder icons pending the real Wasla logo asset (already flagged as missing in MIGRATION_REPORT.md).
- `app/layout.js` wired via the Next.js Metadata API (`manifest`, `appleWebApp`, `icons`, `viewport.themeColor`) rather than hand-written `<link>` tags — Next generates the correct tags for both platforms.
- `components/PWAInstall.js`: registers the service worker on mount; on Android/Chrome, captures `beforeinstallprompt`, suppresses the browser's native mini-infobar (`e.preventDefault()`), and shows a bilingual RTL-aware bottom banner with an Install button that calls `prompt()`; on iOS Safari (which has no `beforeinstallprompt`), shows a "tap Share → Add to Home Screen" instruction banner instead, since iOS has no programmatic install API. Hides entirely when already running standalone (`display-mode: standalone` or `navigator.standalone`). Dismissible, and the dismissal is remembered for 7 days via `localStorage` so it isn't naggy.
- **Verified**: `manifest.webmanifest` (200), `sw.js` (200), and `icons/icon-192.png` (200) all serve correctly from a production build (`npm run start`), and the manifest `<link>` tag renders in the HTML `<head>`.
- **Not verified**: installability on an actual deployed preview URL, per the task's explicit ask — this environment has no deployment/Vercel access (would require credentials/console access I don't have — hard-stop #2 territory for that specific verification step only, not for building the feature). The build-time smoke test above is the strongest verification available here.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change).

---

## Task 3 — Resumed migration: zone-aware product listings
Closed the gap explicitly flagged in Phase 4/MIGRATION_REPORT.md as not done: browse/products/homepage listings previously ignored the visitor's selected delivery zone entirely.
- `GET /api/products` now accepts an optional `zoneId` query param; when present, batch-fetches `ShopZoneCoverage` for the sellers in the result set and annotates each product's `seller.deliversToZone` (`true`/`false`; omitted entirely when no zone is selected, so nothing changes for a visitor who hasn't picked one yet).
- `app/page.js`'s `getFeaturedProducts` does the same for the `Product`-model homepage listing, reading the `wasla_zone` cookie server-side.
- `app/browse/page.js` and `app/products/page.js` now read the zone cookie client-side (`lib/zone.getZoneCookie`) and pass `zoneId` into their existing `/api/products` fetch.
- `components/ProductCard.js`: chose **grey, not hide** (the brief said "hidden or greyed" — greying keeps an otherwise-relevant search result visible instead of vanishing, matching how `shopClosed` already worked). Cards for out-of-zone shops get reduced opacity + partial greyscale, the Add-to-Cart button is disabled and reads "لا يوصل لمنطقتك", same treatment path as a closed shop.
- Did not extend this to the shop-detail page (`/shops/[id]`) — a visitor who explicitly opened a specific shop's page already knows which shop they're looking at; showing every one of that shop's products as unavailable there felt like the wrong call without being asked for it specifically.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change — pure query/annotation addition).

---

## STOREFRONT REBUILD — vape→Sudanese data bug + quick-commerce UI

### Step 1 — Root cause of the vape data appearing
- **`.env` was correct** (points to `ep-silent-frost-axbvo9ct`, the fully-migrated database: 27 Sudanese products, 11 correct categories, verified by direct query).
- **`.env.local` and `.env.vercel.local` both still pointed at the pre-migration database** (`ep-muddy-glade-am2exqpn`: 16 vape products — Elf Bar, Vozol, Lost Mary — under vape categories). Next.js loads `.env.local` with higher priority than `.env`, so the running app (dev server, local builds) was reading the **old vape database** this whole time regardless of how correct every prior migration phase was.
- Fixed both local files to point at the correct database. This is a config fix, not a data or schema fix — no migration involved.
- **Not fixed, flagged**: `.env.vercel.local` is just a local cache from `vercel env pull` — the actual deployed Vercel preview reads `DATABASE_URL` from the Vercel project dashboard, which this environment has no console access to (hard-stop #2). If the deployed preview still shows vapes, `DATABASE_URL` needs updating there directly.

### Step 2 — Deleted wishlist + remaining vape UI
- Wishlist removed entirely: `Wishlist` Prisma model (0 rows — confirmed empty before dropping, migration `20260729131653_remove_wishlist` contains only `DROP TABLE "Wishlist"` plus its two FK constraints, no data-holding drop), `app/api/wishlist/`, `app/wishlist/`, the heart-icon toggle in `ProductCard.js`, and the nav links in `Navbar.js`/`MobileMenu.js`. Also scrubbed a leftover "wishlist items" mention in `app/privacy/page.js`'s data-collection list.
- Found and fixed a second vape-remnant bug independent of the DB mix-up: `app/page.js` had a hardcoded `CATEGORY_ICONS` map keyed on the old vape category names (`Disposables`, `Devices`, `Juices & E-Liquids`, `Spareparts`) — dead code that rendered nothing once real categories replaced the vape ones, but confirms Phase 1's category-icon cleanup (`components/CategoryCard.js`) missed this second, separate icon map in the homepage file. Replaced entirely as part of the Step 3 rebuild.
- Also fixed a stray "e.g. Disposables" category-name placeholder in the admin category form (`app/admin/page.js`).

### Step 3 — Quick-commerce storefront (Breadfast/Rabbit-style shopper UI, multi-vendor backend kept)
- **`components/ZoneBar.js`**: persistent bar under the navbar showing "التوصيل إلى [zone]" from the zone cookie; tapping it clears the cookie and reloads, which re-triggers `ZoneGate`.
- **`components/ProductTile.js`**: compact quick-add tile — image, name, price, and an inline +/- stepper that reads/writes the cart directly (no detail-page hop required); syncs to external cart changes via the existing `cartUpdated` event. Reuses the same `shopClosed`/`outOfZone` unavailable-state pattern as the old `ProductCard`.
- **`components/CartBar.js`**: fixed bottom bar, item count + total, links to `/cart`; hidden on `/cart`, `/dashboard/*`, `/admin`, `/login`, `/register`, `/onboarding`, and for non-customer roles; hidden entirely when the cart is empty.
- **`components/BuyAgainRail.js`**: the wishlist replacement — derives up to 10 distinct recently-purchased products from the signed-in customer's own order history (`GET /api/orders`, already includes `productVariant.product`; added `images` to that select), rendered as a horizontal `ProductTile` rail. No new model.
- **`app/page.js` rebuilt** around: search bar → category grid (11 Sudanese categories, emoji-glyph tiles as real category art doesn't exist yet) as the primary navigation surface → "الأكثر طلباً" (most popular) rail → Buy Again rail → per-origin rails (`Product.originRegion`, capped at 4 regions) → a de-emphasized shops rail at the bottom. Removed the old giant marketing hero and static "How It Works" section to keep the page focused on browsing/buying.
- Cart still splits by shop with its own fee/ETA/minimum at checkout (Phase 4 logic, untouched) — the quick-commerce changes are entirely about browsing/adding, not checkout.
- **Verified** on a production build (`npm run start`): homepage HTML contains zero matches for "vape"/"Elf Bar"/"Vozol"/"disposable"/"wishlist" (case-insensitive), Sudanese category names render, and `/wishlist` now 404s.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅.

---

## PRO REDESIGN — data re-verification + real visual identity

### Step 1 — Data re-verification (repeat check, same conclusion)
Directly queried the confirmed database again: `Category` 11 rows (all Sudanese), `Product` 27 rows (0 vape-named), `MasterProduct` 0 rows, `RetailerProduct` 0 rows — checked this second, separate catalog path specifically because it's what `/products` and `/browse` actually query, and it's where the *old* pre-Phase-1 Excel-import script used to seed rows under categories literally named `Vapes`/`Cigarettes`/`Dokha`/`Disposables` — confirmed empty. All three local env files (`.env`, `.env.local`, `.env.vercel.local`) point at this same clean database. **The only remaining explanation for "vapes still showing" is the deployed Vercel environment's own `DATABASE_URL` (set in its dashboard) — no console access here to check or change it.** Flagged clearly; proceeded to design since unblocked.

### Step 2 — Design token pass + real visual identity
- **Palette**: added Tailwind v4 `@theme` custom color scales to `app/globals.css` — `brand-*` (jabana coffee brown), `accent-*` (terracotta/henna), `hibiscus-*` (karkade red, defined not yet applied), `nile-*` (Nile blue, defined not yet applied), `sand-*`/new `--background` (warm sand, replacing the lavender `#f9f7ff`). Swept `purple-*`→`brand-*`, `violet-*`→`brand-*`, `amber-*`→`accent-*`, and the `#f9f7ff` literal across all 37 files that referenced them.
- **Typography**: added Reem Kufi (`next/font/google`) as the Arabic display face for the wordmark/headings, paired with the existing Cairo body face from Phase 6 — a real two-font identity instead of one sans reused everywhere.
- **Signature/icons**: `components/CategoryIcon.js` — 11 hand-drawn monoline SVG icons, one per real Sudanese category (jabana pot, karkade glass, chili+jar, peanut, okra, wheat, oil jar, sweet, incense burner, thobe, woven basket), replacing the emoji placeholders in `app/page.js`'s category grid and a dead, only-5-of-11-categories text-abbreviation version in `components/CategoryCard.js` (confirmed unused anywhere, rewritten for consistency).
- **Accessibility**: `:focus-visible` outline (accent color) and a `prefers-reduced-motion` rule collapsing all animation/transition durations, added once to `globals.css`'s base layer.
- **Empty states**: `/browse` and `/products`' "no results" states now read "لسه مفيش منتجات هنا" / "جرّب تغيّر الفلاتر" with a small line-art icon instead of generic English text with no icon (loading skeletons already existed here from before this pass).
- **Not done / acknowledged gaps**: no actual screenshot exists — this environment has no headless browser (Playwright/Puppeteer) to capture one, so self-critique was done by reviewing rendered HTML/class output, not a real visual capture. `hibiscus`/`nile` tokens are defined but not yet applied anywhere specific. Did not hand-tune all 37 swept files' individual visual hierarchy beyond the mechanical rename — a few (e.g. admin/dashboard internal tools) likely still read as a generic-template rename-in-place rather than a bespoke pass; the customer-facing storefront (homepage, browse, products, cart, zone gate) got the most direct attention.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change).

### Report against STEP 1 checklist
- [x] DATABASE_URL endpoint printed and stated
- [x] Categories + products queried, confirmed Sudanese not vape
- [x] Root cause determined (deployed Vercel env var, not local files or seed)
- [ ] Purge + reseed — **not needed**, data was already correct; nothing to purge
- [x] Verified zero vape categories/products, counts printed

### Report against STEP 2 / Definition-of-Done (frontend)
- [x] Zone resolved on entry, shown at top (`ZoneBar`), tap-to-change
- [x] Category grid is hero navigation, not a flat list
- [x] Prominent search (homepage + browse/products pages, pre-existing)
- [x] Product tiles with inline +/- steppers, no detail-page hop (`ProductTile`, built prior turn)
- [x] Rails: الأكثر طلباً / اطلب تاني / منتجات من [origin] (built prior turn)
- [x] Persistent cart bar (`CartBar`, built prior turn)
- [x] Wishlist fully removed (prior turn)
- [x] Zero vape anywhere in UI (re-verified this turn)
- [~] Arabic-first, RTL-correct — infrastructure and highest-traffic surfaces yes (Phase 6 + this pass); not every dashboard/admin screen individually verified pixel-correct in RTL
- [x] COD as default at checkout (Phase 5)
- [x] Zone-based delivery fee/ETA shown before payment (Phase 4)
- [x] Loading skeletons + real empty states (this pass, browse/products; other lists had skeletons from earlier phases)
- [x] Real category icons replacing emoji (this pass)
- [x] New subject-grounded palette + typography replacing generic purple template (this pass)

### Report against Definition-of-Done (backend, already built in earlier phases — re-verified via build gate, not rebuilt)
- [x] Multi-vendor model intact — untouched this pass
- [x] Cart splits per shop w/ fee/min-order/ETA (Phase 4)
- [x] Order status flow PLACED→...→DELIVERED/CANCELLED (Phase 4)
- [x] Zone coverage resolves per shop, out-of-zone greyed (Phase 4 gap-closure, prior turn)
- [x] Stock decremented on order (pre-existing, `POST /api/orders`)
- [x] Shop dashboard: listings, zone toggles, order queue (Phase 7)
- [x] `prisma migrate diff` clean; seed produces a browsable demo store (verified this turn)

---

## FIX + BUILD — mobile navigation

### 1. "Tobaki" leftovers found and fixed
Grepped the whole codebase (case-insensitive) for "tobaki" and "toba" fragments (to catch split-span wordmark patterns like the one found and fixed in Navbar.js during Phase 6). Found **two** live, user-facing hits the prior sweeps missed:
- `components/MobileMenu.js` — the mobile hamburger drawer's header wordmark: `toba<span>ki</span>` → `was<span>la</span>`.
- `lib/emailTemplates.js` — the transactional email header: `<h1>toba<span>ki</span></h1>` → `<h1>was<span>la</span></h1>`.

Both were split across a nested `<span>` for the two-tone brand coloring (first part solid, last two letters accent-colored) — exactly the pattern that a literal-string "Tobaki" grep would miss, which is why they survived every previous sweep. Confirmed via a case-insensitive grep across `app/`, `components/`, `lib/` (`.js` only) that zero "tobaki" strings remain anywhere in source. The only remaining "Tobaki" mentions in the repo are in `MIGRATION_AUDIT.md`/`MIGRATION_REPORT.md`/`PROGRESS.md`/`README.md` — all intentional historical/migration-narrative references, not live UI.

### 2. Real mobile bottom tab bar
- **`components/MobileTabBar.js`**: fixed bottom tab bar (`lg:hidden`, so desktop keeps the existing top nav), 5 tabs — Home, Categories (label centralized in one `CATEGORIES_TAB` constant per the task's own note, currently pointing at `/products`; trivial to repoint to a Shops/Brands tab later), Cart (live badge via the same `cartUpdated` event pattern used elsewhere), Orders, and Account (opens a bottom sheet rather than navigating). Hidden on `/dashboard`, `/admin`, `/login`, `/register`, `/onboarding`, and for non-customer roles (they already have the dashboard sidebar) — mirrors `CartBar`'s existing hide logic.
- **Account sheet**: profile link, saved-addresses link (points at `/profile`'s existing single-address field — there's no dedicated multi-address CRUD UI yet, flagging this honestly rather than overbuilding it as part of a nav task), a language toggle (AR/EN, reuses `setLocaleCookie`), an "Install App" entry, and logout.
- **PWA install de-duplication**: extracted the `beforeinstallprompt` capture into `lib/pwaInstall.js` (a shared singleton with subscribe/trigger functions) so both the existing `PWAInstall` banner and the new Account sheet's "Install App" button share one captured event instead of each racing to attach its own listener. `PWAInstall.js` refactored to consume it; behavior unchanged from the user's perspective.
- **Safe-area**: the tab bar and the Account sheet both pad for `env(safe-area-inset-bottom)` so they clear the iOS home indicator. `<main>` gets `pb-16 lg:pb-0` globally so page content isn't hidden behind the fixed bar (minor cosmetic nit: this padding also applies on the few hidden-tab-bar pages like `/login`, harmless extra whitespace, not fixed since it's not a functional bug).
- **`CartBar` repositioned** on mobile (`bottom-20` instead of `bottom-0`) to sit above the new tab bar instead of overlapping it — kept rather than removed, since it shows the live cart *total* (not just count), which the tab bar's badge doesn't.
- **RTL**: tab bar sets `dir` from the locale cookie; relied on native CSS `flex-direction: row` + ancestor `dir="rtl"` mirroring (already how the rest of the app handles RTL) rather than manually reversing tab order — no hardcoded left/right physical properties in the new components, only logical ones (`ms-auto`, `-end-2`, `inset-e-4`).
- **Accessibility**: uses the existing global `:focus-visible` outline and `prefers-reduced-motion` rules from the design-pass `globals.css` changes — no new exceptions introduced.
- **Verified** on a production build: zero "tobaki" strings on the homepage HTML, and all 5 tab labels (الرئيسية / التصنيفات / السلة / طلباتي / حسابي) render in the grid-cols-5 tab bar markup.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change).

---

## STEP 0 + STEP 1 — DB re-verification + real screenshot self-critique

### Step 0
Re-ran `prisma migrate diff` (clean) and checked the live dev server: same root cause as the previous "still broken" report — the running process (new PID this time) had been started, and once confirmed warm, `/api/zones` returned 200 with full zone data and `/api/orders` returned 401 (auth error, not 500). No migration was needed; the schema/DB were never actually out of sync in this pass.

### Step 1 — real screenshot capture (first time this was possible)
Installed Playwright + Chromium (`npm install -D playwright && npx playwright install chromium`) specifically to capture a real mobile-viewport (390×844) screenshot instead of reasoning from rendered HTML/class names, since no headless browser had been available in this environment in earlier passes. Removed the dev dependency again afterward (`npm uninstall playwright`) since it was a one-off verification tool, not something the app needs at runtime.

**Found and fixed two real bugs the screenshot exposed that HTML-only review had missed:**
1. **Navbar wordmark/cart-icon collision in RTL** — `components/Navbar.js`'s logo used `absolute left-1/2 -translate-x-1/2` (a physical-property centering hack) originally meant to keep the logo centered when desktop nav links flanked it. On mobile, nav links are hidden anyway, so nothing justified forcing it out of flow — and centering combined with RTL's mirrored icon-cluster ordering visually crowded the wordmark against the cart icon. Fixed by removing the absolute-centering hack entirely and letting the logo sit in normal flex flow, which is now direction-agnostic by construction rather than by physical-property coincidence.
2. **Redundant mobile primary nav** — the top navbar still rendered a hamburger button and a cart icon on mobile for customers/guests, duplicating the new `MobileTabBar`'s Home/Categories/Cart/Orders/Account tabs — exactly the "keep hamburger AND add tab bar" anti-pattern the task explicitly said not to do. Hidden both for customers/guests (`hasMobileTabBar` flag) while keeping them for sellers/admins, who have no bottom tab bar and still need the hamburger drawer.

**Self-critique notes**: a category tile (`Heritage Clothing`) appeared with a persistent hover-tinted border in the first two capture attempts; traced it to the Playwright script's zone-picker click leaving the synthetic mouse cursor at a screen coordinate that happened to land on that tile after the modal closed — confirmed it disappears once the mouse is explicitly moved away and settled before the screenshot, so **not a real CSS bug**, just a test-harness artifact, and no code change was made for it. Applying the "remove one accessory" check to the resulting layout: found nothing worth cutting — the category grid, rails, and product tiles were already fairly restrained from the prior design pass; the two real fixes above were the actual yield of this exercise, not a decorative trim.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change).

---

## STEP 2 — Resend email order confirmation
- No `RESEND_API_KEY` exists (hard stop #2 — flagged, not blocking). Rather than replace the pre-existing, working SMTP/nodemailer pipeline in `lib/email.js` with a non-functional stub, `sendEmail()` now prefers Resend when `RESEND_API_KEY` is set (lazy-imports the `resend` SDK) and falls back to the existing SMTP path otherwise — so nothing regresses while the key is absent, and dropping in the key later requires zero code changes, just the env var.
- Rewrote `orderConfirmation()` in `lib/emailTemplates.js` fully in Arabic (previously English-only) — items table, delivery address, and now the shop name (`order.seller.businessName`) and a formatted Arabic ETA (`order.promisedEta`, via `toLocaleString('ar-EG', ...)`) that weren't in the email before. `shell()` now takes a `dir` param and sets `lang`/`dir` on the email's `<html>` tag. Other transactional templates (accepted/delivered/new-order-alert/subscription) were left in English — scoped narrowly to the one email every customer actually receives, consistent with prior scoping decisions in this project rather than translating everything at once.
- Added `order.seller.whatsappNumber` and the Resend/SMTP env vars to `.env.example` with inline documentation of the fallback behavior.
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema change this step).

## STEP 3 — WhatsApp shop notification
- **Schema**: added `SellerProfile.whatsappNumber` (nullable `String?`, migration `20260729210429_shop_whatsapp_number`) — kept nullable rather than a DB-level NOT NULL because the 3 existing demo shops had no value and Prisma has no clean single-migration path for adding NOT NULL to a populated table without a default (logged in DECISIONS.md). "Required" is enforced at the application layer instead: shop registration validates it via `isEgyptianPhone`, and the existing 3 demo shops were backfilled with placeholder Egyptian numbers (also added to `scripts/seed.js` so a fresh seed run produces the same result).
- **`lib/notifications/`**: a `NotificationProvider` interface mirroring `lib/payments/`'s established pattern (`get name()`, `notifyShop({ order, shop })`). One implementation today — `WaMeProvider` — builds an Arabic message (order #, item list, total EGP, customer delivery address, shop name, a "must be confirmed" line) and a `wa.me` deep link. `wa.me` has no server-side send API, so this returns `{ sent: false, url }` for the UI to surface rather than pretending to have sent anything automatically.
- Surfaced as "إبلاغ المتجر عبر واتساب" on `app/orders/confirmation/page.js`, right after an order is placed — opens the pre-filled WhatsApp chat in a new tab. Shows a clear "no WhatsApp number on file" message instead of a dead/missing button when the shop hasn't set one.
- **Shop-side**: added a WhatsApp number field to both the seller registration form (`app/register/page.js`, required, validated client- and server-side) and the existing dashboard settings page (`/dashboard/settings`, so shops that registered before this feature can add/update it), backed by an extended `PATCH /api/seller/profile` that now accepts `whatsappNumber` alongside the existing `isOpen` toggle.
- **Hard stop, not a scoping choice**: the real automated send path (WhatsApp Business API via Twilio or Meta) needs an approved WhatsApp Business account plus API credentials — flagged in DECISIONS.md as something only you can supply/approve. The `NotificationProvider` interface is shaped so adding that provider later is a new class, not a restructure of the call sites (`orders/confirmation/page.js` and any future admin surface just call `getNotificationProvider().notifyShop(...)`).
- Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅.

---

## BUILD — email + WhatsApp ownership verification (OTP)

### Schema (additive only — 2 ALTER TABLE ADD COLUMN + 1 CREATE TABLE, no drops)
Migration `20260730102240_email_whatsapp_verification`: `User.emailVerified` (Boolean, default false), `SellerProfile.whatsappVerified` (Boolean, default false), and a new `VerificationCode` model (`channel`, `target`, `purpose`, `codeHash`, `attempts`, `expiresAt`, `consumedAt`) shared by every channel that needs its own code storage.

### Shared core (`lib/verification/`)
- `core.js`: the actual security logic — 6-digit codes, **bcrypt-hashed storage** (never plaintext), 10-minute expiry, single-use consumption (`consumedAt`), a 3-sends-per-10-minutes rate limit per channel+target, and a 5-wrong-tries lockout per code.
- `VerificationProvider.js`: interface (`requestCode`/`checkCode`), mirroring the `lib/payments/` pattern already in this codebase.
- `EmailOtpProvider` (`emailOtp.js`) and `WhatsAppOtpProvider` (`whatsappOtp.js`, only when unconfigured) both go through the shared core; `WhatsAppOtpProvider` delegates entirely to Twilio Verify instead when configured, since Twilio then owns code lifecycle.

### Email verification — fully live, not a stub
No `RESEND_API_KEY`, but `lib/email.js` already falls back to the working SMTP pipeline (from the earlier Resend-integration task), so `EmailOtpProvider` sends real codes today. Wired into:
- `POST /api/auth/register` — fires a code automatically after account creation (non-blocking; failures are logged, never block signup).
- `POST /api/auth/resend-email-code` — **always returns the same generic message** regardless of whether the email exists or is already verified (classic OTP-enumeration leak, avoided per the task's explicit ask), silently no-ops the actual send when there's nothing to verify.
- `POST /api/auth/verify-email` — checks the code, sets `emailVerified: true`.
- `app/verify-email/page.js` — 6-digit input, resend button with a 30s client-side cooldown, redirects to `/login` on success. Wired into `app/register/page.js`'s customer signup path.
- **Enforcement**: `POST /api/orders` now checks `customer.emailVerified` first and rejects with `403 { code: 'EMAIL_NOT_VERIFIED' }` if not; `app/cart/page.js` catches that specific code and redirects straight to `/verify-email` instead of just showing an error banner.

### WhatsApp verification — hard stop for live send, fully stubbed and testable
No Twilio Verify credentials (`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_VERIFY_SERVICE_SID`) exist — genuinely blocked on external provisioning (Twilio account + Meta WhatsApp Business approval + a Verify Service in the Twilio console), not a scoping choice. Exact steps to go live are in DECISIONS.md. Until then:
- `POST /api/seller/whatsapp/send-code` — sellers only; sends to either the number already on file or a new candidate number (not persisted until verified); returns a `devCode` in the response **only** in the unconfigured stub path (never when a real provider is live) so the flow is testable in the dashboard UI, and also logs it server-side.
- `POST /api/seller/whatsapp/verify-code` — checks the code, on success persists the (possibly new) number and sets `whatsappVerified: true`. This is the only place that flag flips on.
- `PATCH /api/seller/profile` (existing route) now resets `whatsappVerified: false` whenever the number actually changes through that path — a changed number always needs re-verification.
- `app/dashboard/settings/page.js`: verified/unverified badge, send-code + code-entry UI, shows the dev stub code inline when present.
- Added the WhatsApp field + client/server validation to seller registration (`app/register/page.js`, `app/api/auth/register/route.js`).
- **Enforcement**: `POST /api/orders` also checks `sellerProfile.whatsappVerified` and rejects with `403 { code: 'SHOP_NOT_VERIFIED' }` if the shop hasn't completed verification — this is the actual "shops MUST verify before they can receive orders" choke point.
- **Backfill**: gating on `whatsappVerified` would have broken checkout for the 3 existing seeded demo shops (new rows default to `false`). Backfilled `whatsappVerified: true` for those 3 (trusted first-party demo data) and added it to `scripts/seed.js` for future reseeds — doesn't weaken the property for real signups.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅.

---

## Hide retailer/seller entry points from customer UI

Retailers are invited privately via a direct link — customers should never see any "become a seller" surface. This was a UI-visibility sweep, not a page deletion: retailer signup and dashboard still work fully via direct link + auth.

### Removed from customer-facing UI
- `components/Navbar.js` — dropped `/shops` from both the logged-in customer nav (`navLinksFor`) and `guestLinks()`.
- `components/MobileMenu.js` — same removal in the mobile drawer's `navLinksFor` (guest + customer branches). `MobileTabBar.js` was checked and was already clean.
- `app/page.js` — removed the entire "Shops Near You" homepage rail (card grid linking to `/shops` and `/shops/[id]`) along with its now-dead `getShops()` data loader and its `Promise.all()` entry.
- `app/register/page.js` — the public page had a visible "I am a… Customer / Retailer" role picker, directly advertising retailer signup to every visitor. Replaced with a `?mode=retailer` query-param gate (`useSearchParams`, wrapped in `Suspense` per Next.js requirement): landing on `/register` normally only ever registers a customer; the retailer flow only activates via the private link `/register?mode=retailer`, which stays open but unadvertised.
- `app/onboarding/page.js` — the post-Google-OAuth onboarding form had an "I want to sell on Wasla" checkbox + business-name field, letting any customer self-select into the retailer role. Removed both from the UI and from the client's submit payload.

### The real hole (found via the security check, not just a UI issue)
`app/api/onboarding/route.js` accepted `becomeSeller`/`businessName` straight from the request body and used it to set `role: 'retailer'` and create a `SellerProfile` — meaning any authenticated customer could self-escalate to retailer with a raw `POST /api/onboarding` call, regardless of what the UI showed. Removing the checkbox alone would **not** have closed this. Fixed by stripping `becomeSeller`/`businessName` handling from the route entirely — onboarding now always sets `role: 'customer'` server-side; there is no seller-selection path through this endpoint anymore.

### Verified already-protected (no changes needed)
- `middleware.js` — `/api/seller/*` and `/api/admin/*` are gated server-side via JWT verification + role check (`ROLE_RESTRICTED`), independent of any UI link. Wrong role → 403, missing/invalid token → 401.
- `app/dashboard/layout.js` — client-side role gate never renders `children` (only a spinner) until `user.role` is confirmed `retailer`/`wholesaler`; unauthenticated/wrong-role users are redirected before any dashboard content shows.
- Left intact: retailer signup (`/register?mode=retailer`), retailer login, retailer dashboard, and `shops/[id]` → breadcrumb/error-state links back to `/shops` (these are internal navigation for a page still reached via legitimate "sold by [shop]" product links, not a recruitment CTA).

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no difference ✅ (no schema changes — UI/API-logic only).

## Customer address book + delivery-address-on-order + full Account page

### Step 0 audit findings
An `Address` model already existed in the schema (governorate, district,
street, building, floor, apartment, landmark, phone, lat/lng) but was
completely unused by app code — no `prisma.address` calls anywhere. It
was clearly scaffolded for this exact feature and never wired up.
`DeliveryZone` was already seeded with the exact 8 zones this task
lists. `Order` had `deliveryAddress` (freeform string), an unused
`addressId` FK, and `deliveryNotes` (unused) — no structured snapshot
columns existed yet.

### Schema (additive only)
Migration `20260731004522_address_book_and_order_snapshot`:
- `Address` gains `label`, `zoneId` (FK → `DeliveryZone`, `SET NULL`),
  `area`, `contactPhone`, `notes`, `isDefault`. Existing columns
  (governorate, district, street, phone, lat/lng) untouched — `governorate`
  is auto-populated from the chosen zone's English name on save so it
  stays meaningful without becoming a second source of truth.
- `Order` gains `addressLabel/Area/Building/Floor/Apartment/Landmark/
  ContactPhone` snapshot columns. Reused the already-unused
  `deliveryNotes` column for the address notes snapshot rather than
  adding a redundant one.
No drops, no renames.

### Address book (`/api/addresses`, `/api/addresses/[id]`)
Full CRUD, scoped to the caller (`getUser(request).userId`) on every
route. `zoneId` must reference a real, active `DeliveryZone` — no free
text. `building`/`floor`/`apartment`/`landmark`/`contactPhone` required
server-side. `contactPhone` normalized to E.164 (`+201XXXXXXXX`) via a
new `toE164Egypt()` in `lib/phone.js`, tolerant of `01…`, `+20…`,
`0020…`, and Arabic-Indic digits. Exactly one default enforced via
transaction (unset-others-then-set); deleting the default promotes the
most recently created remaining address so there's never a gap.

### Checkout — real snapshot, not just a foreign key
`app/cart/page.js` replaced the old freeform textarea with a saved-
address picker (`AddressCard`/`AddressForm`, shared with the Account
page) defaulting to the customer's default address, with inline
add-new. `POST /api/orders` now takes `addressId` instead of a raw
`deliveryAddress` string; the server loads the address, validates its
zone is real/active, resolves shop coverage + fee itself (client input
for zone/fee is no longer trusted at all), and copies every address
field onto the new `Order` row. **Verified live**: placed a test order,
then edited the source address's building/landmark — the placed
order's snapshot fields were unchanged on re-fetch, deleting/editing an
address never touches history.

### Seller order view
`app/dashboard/orders/page.js` now renders the full delivery block per
order: customer name, tap-to-call (`tel:`) + `wa.me` contact phone
(made prominent per the task), building/floor/apartment, area/zone,
landmark, and any notes. **Access scoping confirmed, not just
assumed**: `GET /api/orders` was already filtered by `sellerId` for
seller-role callers and `customerId` for customer-role callers before
this task — verified live that a customer's own `/api/orders` call
only ever returns their own orders, and that an unauthenticated hit on
the seller-only `PATCH /api/orders/:id` status route returns 401. No
cross-shop or customer-directory leak found; nothing needed fixing
here, this was a verification pass.

### Account page (`/profile` rebuilt into a hub)
Sections: Profile (name/phone/whatsapp/city, email shown read-only
with a verified/unverified badge from `emailVerified`), Addresses
(list/add/edit/delete/set-default), Orders (link into `/orders`),
Preferences (language toggle), Account Actions (logout via
`UserContext`'s `logout()` so the `wasla_user_info` cookie is cleared
too, not just localStorage). Fully driven by new `account.*`/
`address.*`/`checkout.*` keys in `lib/i18n.js` (ar default, en
secondary) — no hardcoded UI strings on this page or in
`AddressForm`/`AddressCard`. `dir={locale === 'ar' ? 'rtl' : 'ltr'}` on
the page root. The old `CustomerProfile.deliveryAddress` freeform field
is left in the schema untouched (no migration) but is no longer read
or written by any UI — the address book is now the single source of
truth for delivery addresses.

### Verified end-to-end against the dev DB (cleaned up after)
Created a temporary verified test customer, added a real address
through the actual UI (Playwright, mobile viewport), confirmed via
direct DB query it saved correctly (E.164 phone, correct zoneId,
auto-defaulted as the first address), placed a real order against it
through the live API, edited the address afterward, and confirmed the
already-placed order's snapshot was untouched. Test user/address/order
and the stock decrement from the test order were all removed afterward;
Playwright was installed temporarily and uninstalled after use, per
established practice in this repo.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no
difference ✅. Screenshots (mobile width, 390px): Account page and the
address-add form, both fully in Arabic/RTL by default.

## Browse page category rail rebuild (kill rotated text)

### The bug
`app/products/page.js`'s `CategoryRail` used `writingMode: 'vertical-rl'`
+ `rotate(180deg)` for category labels, fixed-positioned with a
hardcoded `left: 0` regardless of `dir` — always on the left even in
Arabic, where the rail should sit on the right. Long names like "Tea &
Drinks" or "Dakwa & Peanut Products" had no room to not look cramped
sideways. Desktop had a second, separate plain-text category list
duplicated in the Filters aside.

### The fix
Replaced it with a column of upright icon tiles: `CategoryIcon` art (no
emoji) on top, a short label underneath that wraps instead of
truncating, an "All" tile pinned first, and an obvious
terracotta-filled (`accent-400`) selected state vs. soft white
unselected tiles. The rail is the first flex child inside a plain
`flex` row on a `dir`-aware wrapper — no manual left/right classes at
all. Flexbox's main axis follows the ambient writing direction, so the
same markup mirrors correctly in both locales: rail on the right in
Arabic, left in English (verified via Playwright screenshots in both
locales at mobile width — see below). Removed the duplicate desktop
category text list since the rail now covers all breakpoints.

New `components/BrowseProductTile.js`: image or `CategoryIcon`
placeholder on the cream tint, name, price, and a round terracotta "+"
pinned to the tile's bottom inline-end corner (`bottom-2 end-2` —
logical properties, not `right-2`), which becomes a −/qty/+ stepper
once the item is in cart, matching the quick-commerce pattern already
used elsewhere (`ProductTile.js` on the homepage). Sort select, search
input, and the Filters panel (brand/city only now) were restyled from
flat grey borders to warm rounded `brand-100`/`accent-300` tones.

### i18n
Added a `categoryName()` lookup to `lib/i18n.js` — `Category.name` has
no `nameAr` column in the schema (unlike `DeliveryZone`, which does), so
rather than a migration for 11 static rows, Arabic category display
names live in a small dictionary keyed by the English name, same
pattern as everything else in this file. Added a full `browse.*` key
set (title, sort options, filters, search, empty states, add-to-cart)
in both `ar`/`en` — no hardcoded strings in the page or
`BrowseProductTile`.

### Data gaps found and flagged (not fixed — out of scope for a frontend redesign)
While verifying the grid actually renders products, found **two
pre-existing data/architecture issues** on this DB, unrelated to this
redesign:
1. `/api/products` (what Browse actually reads) queries
   `RetailerProduct`/`MasterProduct`, which had **zero rows** on this
   DB — a completely separate catalog system from the `Product` model
   used by the homepage rails (27 active rows there). Browse has
   likely been rendering empty for real traffic regardless of any UI
   work.
2. No seller satisfies all three of `/api/products`'s eligibility
   conditions at once (`approvedByAdmin: true` AND `isOpen: true` AND
   `subscriptionStatus: 'ACTIVE'`) — the 3 legit demo shops are stuck
   on `subscriptionStatus: 'PENDING'`, so even a fully-stocked
   `RetailerProduct` catalog could never surface there today.

Neither was touched — flagging per the task's explicit instruction
("if the whole catalog is empty, that's a data problem, not a design
one"). The new empty state (friendly icon + "لسه مفيش منتجات في القسم
ده" / category-specific messaging) renders correctly for this real
state; it was verified as visually correct in that state before being
temporarily worked around for the populated screenshot below.

### Verified (temporary test data, cleaned up after)
Flipped one seller's `subscriptionStatus` to `ACTIVE` and seeded 4
temporary `MasterProduct`/`RetailerProduct` rows (including one
zero-stock item) purely to render a populated grid for screenshot
verification, then deleted the test rows and reverted the seller's
subscription status back to `PENDING` immediately after.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no
difference ✅ (no schema changes — UI only). Screenshots (390px mobile
width, both locales): rail on the right with terracotta "All" selected
in Arabic; rail on the left in English; 2-up grid with working round
add / stepper button and correct out-of-stock state; no rotated text
anywhere.

## Illustrated category icons — wire-in (assets pending)

### Mapping (confirmed against the DB, not assumed)
`Category.icon` is the real seeded slug (`scripts/seed.js`) — printed
and confirmed with the user before wiring anything:

| DB slug    | Category (ar / en)                          | Asset path                              |
|------------|----------------------------------------------|------------------------------------------|
| `coffee`   | بن وجبنة / Coffee & Jabana                    | `public/categories/coffee-jabana.png`     |
| `tea`      | شاي ومشروبات / Tea & Drinks                   | `public/categories/tea-drinks.png`        |
| `spices`   | بهارات وتوابل / Spices & Seasonings           | `public/categories/spices.png`            |
| `dakwa`    | دكوة وفول سوداني / Dakwa & Peanut Products    | `public/categories/dakwa-peanut.png`      |
| `dried`    | ويكة ومجففات / Weika & Dried Goods            | `public/categories/weika-dried.png`       |
| `grains`   | حبوب وطحين / Grains & Flour                   | `public/categories/grains-flour.png`      |
| `oils`     | زيوت وسمن / Oils & Ghee                       | `public/categories/oils-ghee.png`         |
| `sweets`   | حلويات ومقرمشات / Sweets & Snacks             | `public/categories/sweets-snacks.png`     |
| `bakhour`  | بخور وعطور / Bakhour & Perfumes               | `public/categories/bakhour-perfumes.png`  |
| `clothing` | ملابس تراثية / Heritage Clothing              | `public/categories/heritage-clothing.png` |
| `homeware` | أدوات ومشغولات / Homeware & Handicrafts       | `public/categories/homeware-handicrafts.png` |

No image files exist yet — none were supplied this pass and there's no
image-generation tool in this environment. Per the user's choice, the
full wiring (map, component, all call sites, fallback, alt text) was
built now against this exact convention so it lights up the moment the
11 PNGs land at those paths — no code change needed then.

### Wire-in
`lib/categoryIcons.js` — the single slug→path map (`categoryImageSrc()`).
`components/CategoryIcon.js` rewritten: renders the illustrated PNG
(`object-contain`, crisp regardless of source resolution) when mapped,
falls back to a neutral line-art placeholder — never a broken-image
icon — both when a slug has no map entry and when the file 404s;
`console.warn`s which slug is missing either way. Bilingual `alt` via
the existing `categoryName()` lookup (added in the Browse-rail task).

Replaced every call site that rendered the old English-name-keyed
line-art icon: the Browse rail tiles and its empty state
(`app/products/page.js`), the home category grid (`app/page.js`,
which also now runs category labels through `categoryName()` — they
were silently English-only there before), the Browse product-tile
image placeholder (`components/BrowseProductTile.js`), and the unused
but still-exported `components/CategoryCard.js`. `/api/products` now
selects `icon` on the joined category (previously only `id`/`name`) so
`BrowseProductTile` has a slug to map from.

### A real bug found and fixed during verification
Screenshotting to confirm the fallback path (files intentionally
absent) showed the browser's native broken-image glyph instead of the
placeholder SVG. Root cause: a plain `<img onError={...}>` races
hydration — the DOM `error` event on img/media elements does not
bubble, so React can only catch it via a listener attached directly to
that exact node during commit. On a fast same-host 404, the image can
fail before hydration finishes attaching that listener, and the
failure is silently lost forever (no bubbling means no second chance
via delegation). Confirmed via direct DOM assertions
(`naturalWidth: 0` + `complete: true`, but the `<img>` tag still
present with no `console.warn` ever firing) before fixing. Replaced
the JSX `onError` with an effect-driven `new Image()` probe that runs
strictly after hydration; re-verified all 11 categories correctly
swap to the fallback with the corresponding warning logged.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no
difference ✅ (no schema changes). Screenshots (390px mobile, Arabic):
home category grid and Browse rail both show the (fallback, pending
real assets) icon consistently sized in a cream badge that blends into
each tile — confirmed unified/seamless per the gate, ready to become
the real illustrated set the instant the 11 files are added.

## Category icon fallback isolation — verified, no fix needed

Investigated a report that one missing icon asset (`bakhour-perfumes.png`)
was cascading the fallback to all 11 category icons. Live-tested against
the running dev server with `bakhour-perfumes.png` genuinely absent (the
other 10 present, per the prior filename fix): only the `bakhour` tile
rendered the fallback SVG, with exactly one `[CategoryIcon] failed to
load...` warning logged; the other 10 categories rendered their real
illustrated PNGs.

`CategoryIcon.js` already uses fully local, per-instance `useState`
(`const [failed, setFailed] = useState(false)`), with the load check
keyed to `[slug, src]` in its effect — there is no shared/module-level
or parent-hoisted failure flag, so a genuine cross-instance cascade
was never structurally possible with this code. The earlier appearance
of "all icons falling back together" was fully explained by the two
bugs already fixed before this: the onError/hydration race (made every
icon fail together) and the `" (2)"` filename mismatch (made all 11
404 together) — both made every icon fail *simultaneously*, which
reads the same as a cascade but isn't one. No code change was made;
`CategoryIcon.js` and `lib/categoryIcons.js` are untouched.

## Category icon 404 report — investigated, no proxy/middleware bug found

Investigated a report that all 11 `/categories/*.png` assets were
404ing after `middleware.ts` was supposedly renamed to `proxy.ts`.
Findings:

1. **Files**: all 11 PNGs present and correctly named in
   `public/categories/` (confirmed via directory listing).
2. **No `proxy.ts` exists** in this repo — only the original
   `middleware.js` (unchanged since 2026-07-28, well before this
   investigation). No rename occurred.
3. **`middleware.js`'s `config.matcher` was already correctly scoped**:
   `matcher: ['/api/:path*']` — this only ever runs on `/api/*` routes
   and structurally cannot intercept `/categories/*` or any other
   public static asset. Nothing to exclude that wasn't already excluded.
4. Likely source of the confusion: Next.js 16's dev server labels the
   middleware execution phase **"proxy.ts" in its own request-timing
   log line** (e.g. `POST /api/track/global 204 in 859ms (next.js:
   701ms, proxy.ts: 126ms, ...)`) regardless of the actual on-disk
   filename — this is just Next 16's internal phase-naming as part of
   its middleware→proxy terminology migration (see the separate
   deprecation warning below), not evidence that a file was renamed.
5. Verified live end-to-end on a **fully fresh dev server** (`.next`
   cache cleared, process restarted from scratch, well after
   `middleware.js`'s last edit): all 11 `/categories/*.png` URLs return
   200, and the Browse category rail renders all 11 real illustrated
   images with **zero** `[CategoryIcon]` fallback warnings logged.

**Separate, pre-existing issue flagged (not fixed, unrelated to the
above)**: `next.config.mjs` has had `turbopack: false` since the
project's initial commit — Next.js's `turbopack` config key expects an
object, not a boolean, hence the "Invalid next.config.mjs options
detected... Expected object, received boolean at 'turbopack'" warning
on every server start. This predates any middleware/proxy work and
does not affect routing or asset serving (build/dev both succeed) —
flagging per the request rather than fixing, since it's out of scope
for this investigation and changing it risks altering intentional
Turbopack-disabling behavior without knowing why it was set.

No code changes were made — `middleware.js`, `next.config.mjs`, and
`public/categories/` are all untouched.

## Home-page category icons stuck on fallback — found and fixed (service worker, not CategoryIcon)

### 1–2. Located the component, confirmed it's not hardcoded
`app/page.js`'s `CategoryTile` (the "Shop by Category" grid) already
used the same `CategoryIcon` + `lib/categoryIcons.js` map as the
Browse rail — wired in two tasks ago, not a hardcoded bag icon. So
this was the "already uses CategoryIcon, investigate the load failure"
branch, not a missing wire-in.

### 3. Root cause: the service worker, not the component or the map
`public/sw.js` does cache-first for static assets (`isStaticAsset()`
matches `*.png`, among others) but its fetch handler cached **every**
response it got back, including failed ones — no `response.ok` check.
During the earlier broken window (misnamed/missing category PNGs), any
browser that requested a category image got that 404 written into the
`wasla-v1` cache. Under cache-first, that cached 404 is replayed
forever afterward, completely independent of the real file starting to
serve 200 — which explains the asymmetry: whichever page a given
browser happened to load first during the broken window got its icon
requests poisoned; a browser/tab that only loaded the other page later
(after the fix) got fresh, correct cache entries. This has nothing to
do with which page renders the icon, since both pages request the
identical `/categories/<slug>.png` URLs through the identical
`CategoryIcon` component.

**Reproduced directly** (not just theorized): seeded the running SW's
cache with a synthetic 404 for `coffee-jabana.png`, reloaded the home
page, and confirmed it kept serving the stale 404 (10/11 real images,
`coffee-jabana` missing) even though the live server returns 200 for
that exact URL.

### Fix
`public/sw.js`: only `cache.put()` a response when `res.ok`, so a
failed fetch is never written to the cache in the first place. Bumped
`CACHE_NAME` from `wasla-v1` to `wasla-v2` so the SW's existing
(unchanged) `activate` handler — which already deletes any cache whose
name doesn't match `CACHE_NAME` — evicts a real user's already-poisoned
`wasla-v1` cache the next time their browser's normal SW update check
picks up this file (automatic, no user action required, though a hard
refresh / unregister-and-reload gets it instantly for anyone who wants
that now).

### middleware.js / next.config.mjs — unrelated, unchanged (see the earlier investigation entry above)
Re-confirmed no `proxy.ts` exists and `middleware.js`'s matcher
(`['/api/:path*']`) never touched `/categories/*`; `turbopack: false`
in `next.config.mjs` remains a separate, pre-existing, unrelated
warning. Neither was touched again.

Gate: `npm run build` ✅ (no schema changes, migrate diff not
applicable this pass). Verified home page renders all 11 real
illustrated icons with zero `[CategoryIcon]` fallback warnings,
matching the Browse rail exactly.

## Mobile bottom tab bar — icons were invisible, not missing

### 1–2. Located the component, confirmed the existing icon convention
`components/MobileTabBar.js`'s `TabIcon` already had a full icon set
(home/categories/cart/orders/account, heroicons-outline-style inline
SVG paths) — this project has no icon package dependency
(`lucide-react`/`react-icons`/`@heroicons` — confirmed absent from
`package.json`), just inline SVGs matching heroicons' outline set
throughout (`Navbar.js`, `MobileMenu.js`, `CategoryIcon.js`'s fallback).

### 3. Root cause
`TabIcon`'s `<svg>` had `fill="none"` but was the one place in the
codebase missing `stroke="currentColor"`. With no stroke color set,
every path painted with SVG's default `stroke: none` too — fill
disabled, stroke disabled, so the icon slot was never actually empty
of markup, just invisible. One-line fix: add `stroke="currentColor"`
to match every other icon in this project. No new dependency, no
rewrite of the icon set itself.

Also aligned the inactive icon color (`text-brand-300` →
`text-brand-400`) to match the inactive label's color exactly.

Gate: `npm run build` ✅. Screenshot (390px mobile, Arabic/RTL)
confirms all 5 tabs — house (Home), grid (Categories), cart (Cart,
count badge still rendering over it), receipt (Orders), person
(Account) — with the active tab (Home) in terracotta and the rest
muted brown, correct RTL tab order.

## Simplify seller "Add Product" to a quick-commerce style add (Talabat/Breadfast)

### What was found before changing anything
The existing "Add Product" form (`app/dashboard/products/add/page.js`)
posted to `POST /api/products` — which had been disabled outright:
```
// POST removed — retailers select from catalog instead of creating products
return NextResponse.json({ error: 'Direct product creation is disabled.
Use the catalog selection flow.' }, { status: 410 })
```
The "catalog selection flow" is a separate `MasterProduct`/
`RetailerProduct` system (admin pre-creates a shared `MasterProduct`;
sellers just pick one and set their own price) — flagged as empty on
this DB in an earlier task. Critically, that system doesn't give
sellers their own Name/Brand/Description/Images at all (those live on
the admin-owned `MasterProduct`), which doesn't match a "seller adds a
simple product" form no matter how it's simplified. Presented this
conflict to the user directly rather than guessing; confirmed: revive
direct `Product` creation, retire the disconnected catalog path as the
default seller flow.

### Data model — no migration needed
Order/cart/checkout code addresses everything by `productVariantId`
(`lib/cart.js`, `POST /api/orders`, `BrowseProductTile`, `ProductTile`)
— there was no way to remove `ProductVariant` from the picture without
a much larger refactor, and the task's own proposed mitigation matched
this exactly. `POST /api/products` now creates the `Product` row plus
exactly **one** `ProductVariant` behind the scenes (`label: null`,
the entered price, `stockQty: 999` — a `DEFAULT_STOCK_QTY` constant,
never shown to the seller) to carry the price. No new column, no
migration; `migrate diff --exit-code` confirmed clean.

### Form (`app/dashboard/products/add/page.js`)
Now: Name* / Category* (+ optional Sub-category) / Price* (EGP, single
field) / Brand (optional) / Description (optional) / Images (up to 5,
unchanged upload). Removed entirely: the Variants section, Label,
SKU Code, per-variant Stock Qty, "+ Add Variant" / "+ Add another
variant" rows. Bilingual via new `seller.*` keys in `lib/i18n.js` (both
locales) and `dir` set on the page's own content — the surrounding
dashboard shell (sidebar nav labels, etc.) was already 100% hardcoded
English before this task and stays that way; bringing the whole seller
dashboard through i18n wasn't part of this ask.

### The other half: GET /api/products was reading from the dead catalog too
Rewrote the public listing endpoint (what the Browse page and
`BrowseProductTile` actually call) to query `Product`/`ProductVariant`
directly — the same model `GET/PATCH/DELETE /api/products/[id]` and the
homepage rails already used. This was required for the gate to mean
anything ("a created product shows correctly in the catalog and can be
checked out") — without it, a seller could create a product that would
never appear anywhere a customer shops. Side effect: this also fixes
the previously-empty Browse listing flagged in an earlier task — all 27
seeded products now show up — and wires up the `brand`/`city` query
params, which the old RetailerProduct-based handler accepted from the
UI but silently never filtered on.

### Verified end-to-end (test data cleaned up after)
Created a product via the simplified API (name + category + price +
brand only, exactly what the new form sends), confirmed it appeared in
`GET /api/products`, then logged in as a real test customer and placed
an order against its auto-created variant: **total came back as 247 =
123.5 × 2**, and `priceAtPurchase` matched the entered price exactly —
the price genuinely flows from the simplified form through cart and
checkout unchanged.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no
difference ✅ (no schema change, as anticipated).

## Seller "My Products" not showing newly-created products — found and fixed

### 1–3. Not an ownership/sellerId mismatch
Checked both sides explicitly: `POST /api/products` stamps
`Product.sellerId: sellerProfile.id` correctly (confirmed live — two
products the user had already created, "cups" and "dsd", both had
`sellerId: 1` in the DB), and `Product.sellerId` is a required,
non-nullable column in the schema — a null owner was never possible at
the DB level in the first place. `GET /api/seller/products` already
filtered `where: { sellerId: sellerProfile.id }`, the same field.
Both sides of the intended fix already agreed.

### The real bug
`app/dashboard/products/page.js` (the "My Products" page itself) was
never updated when the create/browse endpoints were switched back to
direct `Product` creation in the previous task — it still called the
now-retired `GET /api/seller/retailer-products` (the old
`MasterProduct`/`RetailerProduct` catalog). A seller's real,
correctly-owned products simply weren't the model that page was asking
about, so they never appeared there, while showing up fine in the
public catalog (which reads `Product` directly, fixed last task).

### Fix
- `app/dashboard/products/page.js` now calls `GET /api/seller/products`
  and renders the `Product`/`ProductVariant` shape: name/images live
  directly on the product, price/stock come from its single variant,
  `isActive` replaces the old PENDING/APPROVED/REJECTED status concept
  (which belonged to `RetailerProduct`, not `Product`), and "Remove"
  now calls `DELETE /api/products/[id]` (soft-delete/deactivate) instead
  of hard-deleting a `RetailerProduct` row. The header/empty-state
  button now points at the working `/dashboard/products/add` instead of
  the retired `/dashboard/catalog`.
- `GET /api/seller/products` previously only selected `_count.variants`
  — added the actual `variants` (`id`/`label`/`price`/`stockQty`) so the
  dashboard has something to render.

### Verified live (no backfill needed — nothing was ever mis-owned)
Confirmed the user's pre-existing "cups" and "dsd" products (created
before this fix, invisible in their dashboard until now) appear
correctly with price/stock. Created a fresh product and confirmed, in
one pass: it shows in that seller's own My Products immediately, shows
in the public catalog, and does **not** appear in a different seller's
(`seller2@wasla.com`) My Products — ownership isolation intact in both
directions. Test product cleaned up after.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no
difference ✅ (no schema change).

## Phase 1 — seller type (Shop vs Restaurant) foundation

### Step 0 audit
`SellerProfile` (1:1 with `User` via `userId`) is the seller model; a
seller is identified by `User.role` (`'retailer'`/`'wholesaler'`, plain
`String`, not an enum) plus a linked `SellerProfile` row. `Product` already
relates via `sellerId → SellerProfile.id`, so a product's seller type
is always derivable through that relation — confirmed before migrating,
no need to duplicate the field onto `Product`.

### Schema (additive only)
Migration `20260731164327_seller_type`: new `SellerType` enum
(`SHOP | RESTAURANT`), new `SellerProfile.sellerType` column,
`NOT NULL DEFAULT 'SHOP'` — every existing seller (all shops today)
keeps working unchanged, no drops, no renames. `migrate diff --exit-code`
confirmed clean both before and after applying.

### Onboarding / Settings
- `app/register/page.js` (the invite-only seller signup): required
  Shop/Restaurant toggle, sent as `sellerType` on
  `POST /api/auth/register` (defaults to `SHOP` server-side if a caller
  omits it).
- `app/dashboard/settings/page.js`: new "Business type" card, editable
  any time — `PATCH /api/seller/profile` now accepts `sellerType`
  alongside the existing `isOpen`/`whatsappNumber` fields.

### Add Product form — wording branch + seams for later phases
`app/dashboard/products/add/page.js` now fetches the seller's own
`sellerType` (`GET /api/seller/profile`) on load. SHOP sellers see
*exactly* the same form as before this phase ("Add Product"/"Product
Name"/"Create Product"); RESTAURANT sellers see "Add Dish"/"Dish
Name"/"Create Dish" — via new bilingual `seller.*` keys in
`lib/i18n.js` (both locales). No new fields were added for either type.

Two clearly marked seams left in the form for the next phases:
- **SHOP-SPECIFIC FIELDS SEAM** (Phase 2 plugs in here): real stock-
  management fields (quantity on hand, low-stock threshold, etc.) for
  SHOP sellers. Today stock still defaults to `DEFAULT_STOCK_QTY` in
  `app/api/products/route.js`, invisible to the seller, unchanged from
  the prior phase.
- **RESTAURANT-SPECIFIC FIELDS SEAM** (Phase 3 plugs in here): dish
  fields (spice level, prep time, dietary tags, etc.) and the
  customer-facing browse-by-restaurant experience — explicitly not
  built yet, per this phase's "foundation only" scope.

### Verified live (not just read from source)
Confirmed via the running dev server: an existing seller's profile
defaults to `SHOP`; `PATCH /api/seller/profile` with
`{ sellerType: 'RESTAURANT' }` persists and is reflected on the next
`GET`; the Add Product page then renders "إضافة طبق" / "اسم الطبق"
(Dish wording); switching back to `SHOP` via the settings page
re-renders "إضافة منتج" / "اسم المنتج" (Product wording) — both
directions confirmed against real, changing state, not a static read.

Gate: `npm run build` ✅, `prisma migrate diff --exit-code` reports no
difference ✅. No customer-facing change in this phase (browse-by-
restaurant is Phase 3, per the brief).

## Animation & interaction pass — Emil Kowalski's design-engineer skills

### Setup
`npx skills@latest add emilkowalski/skills` — installed all 8 skills
(animation-vocabulary, apple-design, emil-design-eng,
find-animation-opportunities, improve-animations, pick-ui-library,
prototype, review-animations) into `.agents/skills/` +
`.claude/skills/` (symlinked). The harness's live `Skill` tool didn't
pick them up mid-session (listing not refreshed), so the SKILL.md
files were read directly from disk instead — same content, same
authority, just a different retrieval path.

### Audit (find-animation-opportunities) — full report given to the user before implementing
Swept the 7 named surfaces. Six candidates survived the four-question
gate (frequency / purpose / speed / function) and were implemented;
the rest were explicitly rejected with the gate question that killed
them — full table + rejections in the conversation transcript. Kept
here as the durable record:

**Implemented:**
1. Add-to-cart "+" → stepper morph (`BrowseProductTile.js`,
   `ProductTile.js`) — was an instant conditional-render swap, no
   bridge between states. Now both states stay mounted and cross-fade/
   scale in place, 160ms `var(--ease-out)`.
2. `CartBar` enter/exit — was a hard `return null` at `count===0`
   (full teleport). Now animates `translateY(100%)→0` + opacity, 250ms
   `var(--ease-drawer)`, plus a brief settle pulse when the count
   increases.
3. Cart page quantity stepper buttons — had zero `:active` feedback at
   all. Added `scale(0.95)`, 120ms.
4. Mobile bottom-nav active-tab state — instant color swap, no
   transition. Added a 120ms color-only fade (no transform — 100+/day
   frequency disqualifies anything bigger).
5. Order-placed confirmation — silent redirect on checkout success.
   Added a Sonner toast (see below) right before the redirect; this is
   the one rare/occasional, high-emotion moment in the flow that earns
   the delight budget.
6. Category rail scroll-snap — native `overflow-y-auto` had no snap.
   Added `scroll-snap-type: y proximity` — CSS-only, only ever
   triggered by a genuine user scroll, satisfies the hard constraint
   that the rail stays 100% user-driven.

**Explicitly rejected** (see conversation transcript for full gate
reasoning): route/page transitions (tens/day, no purpose beyond
"looks cool"), a toast on every individual add-to-cart (too frequent;
the morph above already is the feedback), bottom-nav icon shape/bounce
(100+/day, disqualified outright), any auto-scroll/momentum on the
category rail (explicit hard constraint), and touching the existing
skeleton/shimmer loaders (already correct, out of scope).

### Library choice (pick-ui-library)
`react-hot-toast` was installed and mounted (`<Toaster/>` in the root
layout) but had **zero `toast()` calls anywhere in the codebase** —
confirmed via grep before touching anything. Since nothing was built
on it, swapped to Sonner (the skill's curated pick for toasts) in the
same turn rather than leaving dead weight or building a second toast
system alongside it. Wired `dir={dir}` so toasts mirror correctly in
Arabic.

### Shared vocabulary
Added `--ease-out` / `--ease-in-out` / `--ease-drawer` to
`app/globals.css`'s `:root` — the exact curves named in the
`animation-vocabulary` skill — as the one shared source every
animation in this pass (and future ones) should extend rather than
inventing parallel ad-hoc curves.

### Reduced motion — used the existing global rule, not per-component overrides
`app/globals.css` already had a blanket
`@media (prefers-reduced-motion: reduce) { *, *::before, *::after {
transition-duration: 0.01ms !important; ... } }` rule predating this
task. Verified live via Playwright (`reducedMotion: 'reduce'` context)
that this `!important` rule correctly overrides even the new
**inline** `style` transitions added in this pass (computed
`transitionDuration` came back `1e-05s` on the add-to-cart button) —
so every new animation automatically respects reduced motion with no
extra per-component media queries needed.

### Verified live (Playwright, mobile width, both locales)
- Arabic (`dir="rtl"`): Browse rail on the right, add-to-cart morph
  (tile → stepper) confirmed by clicking a real "+" button and
  screenshotting before/after, CartBar animating in with the correct
  count/total, cart page stepper mirrored correctly.
- English (`dir="ltr"`): confirmed rail mirrors to the left.
- Reduced motion: confirmed transition duration is forced to near-zero
  (see above).
- Order-placed toast: the checkout code path (`toast.success(...)`
  called unconditionally right before `router.push`) was exercised
  live multiple times — orders were successfully created end-to-end
  (confirmed via server logs, e.g. `POST /api/orders 201`) — but a
  clean screenshot of the toast bubble itself wasn't captured; see the
  flagged issue below for why.

### Found and flagged: a pre-existing bug in the checkout success path (NOT caused by this pass, NOT fixed — out of scope)
While verifying the order-placed toast, checkout repeatedly triggered
a React "Maximum update depth exceeded" error immediately after a
successful `POST /api/orders`, which prevented the client-side
`router.push('/orders/confirmation')` from completing — the user stays
on `/cart` even though their order was actually created successfully
server-side. **Isolated definitively**: reverted `CartBar.js` to its
pre-this-task state and reran the identical test — the error still
reproduced identically. This rules out every change made in this pass
and points at something already in `app/cart/page.js`'s own effects
(likely the delivery-quote-refetching effect, which was independently
observed firing ~12 times in a row before checkout even in earlier,
unrelated screenshot verifications this session). Orders are not lost
— they're created correctly — but customers may not see the
confirmation page reliably. This needs its own investigation and is
deliberately not touched here, since diagnosing/fixing a pre-existing
render loop is well outside an animation-pass's scope and risked
compounding an unrelated bug under this task's changes.

Gate: `npm run build` ✅ (no schema changes, migrate diff not
applicable this pass). Seven commits, one per surface plus setup.

## Mobile layout fix: horizontal category rail + bottom-nav verification

### Problem 1 — category rail was a vertical side strip on mobile (confirmed and fixed)
`app/products/page.js`'s `CategoryRail` rendered as a `w-20 sm:w-24`
vertical column at **every** width, including mobile — eating a fifth
of a 390px viewport's horizontal space for a filter control. Split it
into two components:
- **`MobileCategoryRail`** (new, `sm:hidden`): a horizontal row at the
  top of the product area, in normal document flow (no fixed/absolute
  positioning), native momentum scroll + `scrollSnapType: 'x
  proximity'`. User-driven only — nothing here can auto-advance.
- **`CategoryRail`** (existing, now explicitly `hidden sm:flex`): kept
  as the vertical side rail for desktop, where the horizontal space
  cost doesn't apply the same way.

Both rely on the page's ambient `dir` attribute for which edge the row
starts from, rather than a hardcoded side — the same pattern already
used for the desktop rail. **Verified live**, not just by inspection:
in Arabic the rail's `scrollLeft` starts negative (Chromium's RTL
convention for "at the start/right edge"); in English it starts
positive near zero (left edge) — confirmed via direct DOM query, and
visually via screenshot (rail visibly starts at the right in Arabic,
left in English, in both cases with the product grid below at full
width).

Also fixed the selected-category styling on **both** rail variants:
was `bg-accent-400` (a solid terracotta flood), which reads wrong now
that the tiles hold real illustrated photos rather than flat
single-color line art. Both now use `ring-2 ring-accent-400` + a
subtle tinted background instead of a flood.

### Problems 2 & 3 — bottom nav / cart reachability: verified already correct, not touched
Read `components/MobileTabBar.js` before assuming anything was broken.
It was already a proper fixed-bottom, full-width, 5-tab nav (Home /
Categories / Cart with live badge / Orders / Account-sheet), with
`pb-[env(safe-area-inset-bottom)]`, terracotta active-state color, and
a `dir` attribute for RTL. Nothing here needed restoring — it was
never merged into the side rail; the two components are independent
and the rail fix above didn't touch it.

**Verified live** rather than taken on faith: added a product to cart,
confirmed the bottom nav's Cart tab badge showed the live count ("1"),
confirmed `CartBar` (the persistent bottom summary bar, animated in a
previous task) rendered above the nav showing the right price, tapped
the Cart tab, confirmed it navigated to `/cart`, and confirmed the
cart page actually listed the added item — the full reachability path
end to end.

Gate: `npm run build` ✅ (no schema changes). Screenshots (390px
mobile, both locales) confirm: horizontal rail at top (right-start in
Arabic, left-start in English), ring-not-flood selected state, real
icons intact, full-width 2-column grid, fixed 5-tab bottom nav with
live badge in both locales.

## Cart/Checkout visual polish (layout + styling only, per the brief)

### Root cause of "narrow column, dead gutter"
`app/cart/page.js` had **no `dir` attribute anywhere** — it always
rendered LTR-structured regardless of locale, which is why the layout
felt off specifically for Arabic-primary users. Added `dir={dir}` on
the page root. Cart items (first in DOM) now sit at the inline-start
edge of the row and the Order Summary becomes a `lg:sticky` side card
at inline-end — right-to-left in Arabic, mirrored automatically in
English via the same markup (the established pattern from earlier
RTL work in this app: flexbox's main axis follows the ambient writing
direction, no hardcoded left/right). Confirmed via screenshot at
mobile (390px) and desktop (1440px) in both locales.

### A real bug found while verifying (fixed, layout-only)
The page had no bottom padding to clear the fixed `MobileTabBar` —
content near the bottom of a tall page (a second saved address card)
was rendered directly underneath the fixed nav and was unclickable.
Added `pb-20 lg:pb-0`, matching the convention already used on other
pages (`app/page.js`). Confirmed by reproducing the click failure
first, then confirming the fix restored clickability.

### Out-of-zone state — elevated from fine print to a real alert
Was one line of small red text folded into a per-shop breakdown card.
Now a proper banner (warning icon + bold title + explanatory body)
using the `hibiscus-*` (karkade red) tokens — defined in the palette
pass months ago specifically "reserved for alerts" but never actually
used on a screen until now. The per-shop card still calls out which
shop is affected. **Confirmed server-side enforcement already exists**
(`POST /api/orders` rejects with 400 if the address's zone isn't in
the shop's `ShopZoneCoverage`) — not modified, just confirmed. The
Place Order button is now genuinely `disabled` (not just blocked
inside the click handler) whenever the cart is uncovered or no address
is selected yet, with a hint shown proactively rather than only after
a failed click attempt.

**Verified live**: seeded a test address in a zone genuinely outside
the shop's coverage (first attempt accidentally picked a zone the
demo shop *does* cover — re-checked `ShopZoneCoverage` directly and
picked a real gap), selected it, and confirmed the banner renders, the
delivery fee recalculates to 0, the total drops accordingly, and the
checkout button visibly disables — all from the live app, not just
code inspection.

### Visual rhythm
Consistent card spacing and section-heading weight throughout; Total
promoted to `text-xl font-black` (clearly heavier than Subtotal/
Delivery, per the brief); address cards, the "Add a new address"
action, and payment method options now share one rounded-2xl,
bordered-selectable-card visual language; the primary CTA switched
from `bg-brand-700` (the app's general coffee-brown chrome color) to
`bg-accent-500` (terracotta) — correcting a mismatch against the
palette's own stated token purpose (`accent` = "CTAs, prices,
quick-add").

### Bilingual
Every string on the page — including the `setError()` messages inside
`handleCheckout`, where only the text changed and none of the
conditions/logic did — now goes through new `cart.*`/`checkout.*` keys
in `lib/i18n.js`, both locales. No hardcoded English left on the page.

Gate: `npm run build` ✅ (no schema changes, no cart/pricing logic
touched). Screenshots confirm mobile + desktop, both locales, the
out-of-zone alert state, and the disabled-checkout state.

## Shop commission wallet (prepaid, 5% per completed order)

**Schema** (additive migration `20260731232441_shop_wallet`, confirmed
clean both directions via `prisma migrate diff --exit-code`):
`SellerProfile.walletBalance` (Decimal, default 0, can go negative),
new `WalletTransaction` model (append-only ledger: shopId, signed
amount, type `TOPUP|COMMISSION|ADJUSTMENT`, balanceAfter, nullable
orderId, note, createdBy, createdAt) with `@@unique([orderId, shopId,
type])` and `@@index([shopId, createdAt])`. The ledger is the source
of truth; `walletBalance` is a running total kept in sync in the same
transaction as every ledger insert.

**Money-safety design** (`lib/wallet.js`), because this is a real
double-spend surface with concurrent order completions hitting the
same shop's wallet:
- Every mutation (`deductCommission`, `topUp`, `adjustBalance`) opens
  a Prisma transaction and takes `SELECT ... FOR UPDATE` on the
  `SellerProfile` row **first**, before anything else. Two concurrent
  transactions for the same shop serialize on that lock — the second
  can't read the balance until the first has committed.
- `deductCommission` checks for an existing `(orderId, shopId,
  COMMISSION)` ledger row *after* acquiring the lock, not before —
  ordering matters here: if the existing-row check happened before the
  lock, a second concurrent call could pass the check, then block on
  the lock, then double-deduct once unblocked. Locking first closes
  that window.
- The `@@unique([orderId, shopId, type])` constraint is a second,
  independent backstop: even if the locking discipline were ever
  violated by a future code change, a duplicate insert fails outright
  and rolls back the whole transaction (balance mutation included).
- Verified live with two `deductCommission` calls fired via
  `Promise.all` against the same order+shop: exactly one deducted,
  one skipped, exactly one ledger row, exactly one 5% deduction
  reflected in the final balance.

**Commission basis**: 5% of `Order.total` only. Confirmed by re-reading
the existing `POST /api/orders` handler that `Order.total` is already
computed purely from item prices — `deliveryFee` is a separate column
never folded into it — so no new field was needed to represent "goods
subtotal." Deliberately did not touch the pre-existing, unrelated
`Order.commission`/`commissionRate` fields (10%, computed at placement,
feeding only the `/api/admin/commission` analytics dashboard) — grepped
their only usage to confirm they're informational and structurally
different (different rate, different timing, different basis) from
this wallet mechanism, and left them untouched rather than risk
altering existing analytics behavior.

**Deduction timing + idempotency**: fires inside the existing
`DELIVERED` branch of `PATCH /api/orders/[id]`, wrapped in try/catch so
a wallet failure can never block the order status transition (mirrors
the existing non-blocking pattern already used there for email/
WhatsApp sends). Idempotent on `(orderId, shopId)` — re-firing the same
status update is a no-op, verified live.

**Order-placement gate**: `POST /api/orders` now selects
`walletBalance` alongside the existing `whatsappVerified` check and
rejects with `403 { code: 'SHOP_WALLET_BLOCKED' }` if the shop's
*current* balance is `<= -100`. Because the cart checkout flow already
splits a multi-shop cart into one `POST /api/orders` call per seller
(from earlier session work), this gate naturally applies per-shop
without extra looping. Credit limit is fixed at -100 EGP; a shop is
only unblocked by a top-up that brings the balance back above it —
verified live (drove a test shop to -110 via adjustment, confirmed
`isBlocked` true, topped up, confirmed `isBlocked` false).

**Admin**: `GET /api/admin/wallets` (list, sorted worst-balance-first,
`blocked` flag included), `GET /api/admin/wallets/[sellerId]` (wallet +
full ledger), `POST .../topup` and `POST .../adjustment` (adjustment
requires a non-empty note) — all admin-only (`auth.role !== 'admin'` →
403, backstopped by `middleware.js`'s existing `ROLE_RESTRICTED` map
for `/api/admin/*`). New `WalletsTab` component
(`components/admin/WalletsTab.js`, new directory — no prior
`components/admin/` convention existed, so this establishes one) added
to `app/admin/page.js` as a new `Wallets` tab: blocked shops surface in
a dedicated hibiscus-red banner at the top, full shop table below,
click-through to a modal with ledger + top-up/adjustment forms.

**Seller**: `GET /api/seller/wallet`, scoped to the caller's own
`sellerProfile` via `userId` (same ownership pattern as every other
`/api/seller/*` route — a shop can't read another shop's wallet by
guessing an id, since the id is never taken from the request). New
`/dashboard/wallet` page: balance card ("you have EGP X" / "you owe
EGP X"), a hibiscus-red blocked banner or an accent-colored
near-limit warning (`<= -70`, ahead of the -100 hard block), and the
full ledger. New `wallet.*` i18n keys in both `ar`/`en` blocks; page
uses the standing `dir={dir}` RTL pattern.

**Gate**: `npm run build` ✅. `prisma migrate diff --exit-code` → no
difference, both before and after all app-layer wiring. Full
end-to-end simulation run directly against the dev DB via a scratch
script (deleted after the run, test seller/user/orders/ledger rows
cleaned up in a `finally` block): top-up +200 → balance 200, one
TOPUP row; complete a 1000 EGP goods + delivery order → balance drops
exactly 50 (5% of goods only), one COMMISSION row tied to the order;
re-fire the same completion → no second deduction, still one row;
adjustment to -110 → blocked; top-up → unblocked; two concurrent
completions on a second order → exactly one deduction, exactly one
ledger row. All admin wallet routes confirmed admin-gated and the
seller route confirmed self-scoped by code audit.

## Fix: infinite render loop on the cart page

`app/cart/page.js` had a "Maximum update depth exceeded" loop. Root
cause: `zone` was a plain object literal rebuilt from `selectedAddress`
on every render (`{ id, nameEn, nameAr }`), so it got a new reference
each time. A `useEffect` fetching delivery quotes depended on `zone`
directly (`[zone, JSON.stringify(sellerIds)]`) — new `zone` reference
every render → effect fires → `setQuotes` → re-render → new `zone`
reference → effect fires again, forever.

Fixed by memoizing `zone` with `useMemo`, keyed on its actual primitive
inputs (`hasZone`, `zoneId`, `zoneNameEn`, `zoneNameAr`) instead of
being rebuilt as a fresh object every render — the effect's dependency
is now stable across renders that don't change the selected zone. No
effect/state was deleted here since the quotes effect is a genuine
external fetch (not a pure derivation of existing props/state); the
other cart totals (`subtotal`, `deliveryFee`, `total`, `anyUncovered`,
`canCheckout`) were already computed inline during render rather than
mirrored into state, so no changes were needed there.

Gate: `npm run build` ✅. Verified the cart route renders cleanly
server-side with no errors; this environment has no headless browser
available to capture live console warnings interactively, so the fix
was verified by tracing the dependency-identity chain rather than a
captured screenshot/console log.

## Phase 3a: Restaurants section on home (browse by restaurant)

DB endpoint (printed before any DB work, per task instructions):
`ep-silent-frost-axbvo9ct-pooler.c-4.us-east-2.aws.neon.tech/neondb`.
No migration needed — `SellerProfile.sellerType` (`SHOP` | `RESTAURANT`)
and the seller-side "dish" creation flow already existed from Phase 1/2
(`app/dashboard/products/add/page.js`); dishes are ordinary `Product`
rows owned by a `RESTAURANT`-type seller, same model shop products use.

**New read surface**: `GET /api/restaurants` (list, approved RESTAURANT
sellers) and `GET /api/restaurants/[id]` (one restaurant + its active
`Product` rows as the menu, same shape `/api/products` returns so
add-to-cart is unchanged). Both added to `middleware.js`'s
`OPTIONAL_AUTH_PREFIXES` (public GET, same as `/api/shops`).

**Keeping restaurants out of shop browsing**: every query that powers
"Shop by Category" or general product browse now filters
`seller: { sellerType: 'SHOP' }` — `app/api/products/route.js` (GET),
`app/page.js`'s `getPopularProducts`/`getOriginRails`/`getCategories`
(the category `_count` is now scoped to `seller.sellerType: 'SHOP'`
too, so a restaurant's dish count never inflates a category tile), and
`app/api/shops/route.js` (`sellerType: 'SHOP'` added to its `where` so
restaurants don't show up as shop cards on `/shops`).

**Home page**: `app/page.js` adds a `RestaurantSection` (horizontal
scroll of `RestaurantTile`s, avatar-letter fallback like `ShopCard`)
positioned above the category grid; hidden entirely when there are zero
approved restaurants (`RestaurantSection` returns `null`).

**New page**: `app/restaurant/[id]/page.js` — client component
(fetches `/api/restaurants/[id]`, mirrors `app/shops/[id]/page.js`'s
structure) showing the restaurant header (name, city/area, dish count)
and its menu grid; empty menu shows a "Menu coming soon" state instead
of a broken/empty page. Add-to-cart reuses `lib/cart.js` unchanged
(dishes are just `Product`/`ProductVariant` rows). Fully bilingual via
new `home.restaurants` / `restaurant.*` keys in `lib/i18n.js`
(ar + en); RTL is automatic via the existing `dir={dir}` set on `<html>`
in `app/layout.js` from the locale cookie, plus explicit `rtl:`/`ltr:`
Tailwind variants on the one absolutely-positioned price badge.

**Gate**: `npm run build` ✅. Verified live against the dev DB and a
temporary Playwright-driven Chromium session: seeded a throwaway
`RESTAURANT` seller + one dish, screenshotted the home page (Arabic,
390px width) showing "المطاعم" above "تسوق حسب الفئة", and the
restaurant page showing its menu with a working add-to-cart (confirmed
the item landed in `localStorage`'s cart). Confirmed via
`/api/products?search=...` that the dish does not appear in the general
product browse. All test rows (user, seller profile, product/variant)
deleted immediately after via a cleanup script — nothing seeded here
is left in the database.

## Wasla brand assets: favicon, PWA icons, animated loader

Wired in the provided brand assets (not regenerated/redrawn) —
`favicon.ico`, `icon-16/32/48/64/96/192/512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`, `wasla-splash.gif` —
all placed at `public/` root per the brief.

**Favicon**: `public/favicon.ico` + a full `metadata.icons.icon` array
in `app/layout.js` (favicon.ico plus every PNG size) so the tab icon
resolves correctly across browsers instead of falling back to the
Next.js default.

**Manifest**: `public/manifest.webmanifest` now registers `icon-192`,
`icon-512` (purpose "any") and `icon-maskable-512` (purpose
"maskable"), plus the full 16–512 set for broader OS icon-picker
support. `background_color` → `#F3EDE2` (cream), `theme_color` →
`#C1502E` (terracotta/accent-400) — replacing stale purple
(`#7e22ce`/`#f9f7ff`) placeholder values left over from before the
Wasla rebrand. `app/layout.js`'s `viewport.themeColor` updated to match
(`#6F4E37` → `#C1502E`).

**iOS**: `icons.apple` → `/apple-touch-icon.png` (Next's metadata API
emits the `<link rel="apple-touch-icon">` tag from this). `apple-touch-
icon.png` is intentionally opaque (verified via `sharp` metadata:
`hasAlpha: false`) — iOS renders transparency as black, so this file
must never be swapped for a transparent PNG. `appleWebApp` metadata
covers `apple-mobile-web-app-title`/`status-bar-style`; Next 15 only
auto-emits the standardized `mobile-web-app-capable` meta tag now, not
the legacy Apple-prefixed one, so `metadata.other` adds
`apple-mobile-web-app-capable: yes` explicitly — older iOS Safari still
needs it to launch standalone (no browser chrome) from the home
screen. No iOS static splash screen was previously configured, so
there was nothing to fix regarding "GIF as splash" — noted here in
case one gets added later: it must be a static PNG, never the GIF.

**Loader**: new `components/Loader.js` — centered `wasla-splash.gif` on
the cream background, swapped for a static PNG
(`public/wasla-splash-static.png`, extracted from the GIF's first frame
via `sharp`, not redrawn) when `prefers-reduced-motion: reduce` matches
live via a `matchMedia` listener. Wired in as `app/loading.js`, Next's
route-level loading UI shown while a page/segment's data is still
being fetched.

**Cleanup**: deleted `public/icons/` (the old purple-branded
icon/maskable-icon PNGs and SVGs) — fully superseded and, after
updating `public/sw.js`'s `APP_SHELL` precache list from `/icons/
icon-*.png` to the new root-level paths, no longer referenced anywhere
(confirmed via a repo-wide grep for `/icons/`). Service worker cache
bumped `wasla-v2` → `wasla-v3` so existing installs evict the stale
`/icons/*` cache entries instead of serving them forever under the
cache-first strategy.

**Gate**: `npm run build` ✅. Verified live via the dev server +
Playwright/Chromium: `favicon.ico`, `manifest.webmanifest`,
`apple-touch-icon.png`, and `wasla-splash.gif` all serve 200 with the
expected bytes; the rendered `<head>` was inspected directly — 8 `<link
rel="icon">` entries (favicon.ico + all 7 PNG sizes), one `<link
rel="apple-touch-icon">`, `apple-mobile-web-app-capable` +
`mobile-web-app-capable` + `apple-mobile-web-app-title` +
`apple-mobile-web-app-status-bar-style` meta tags, `<link
rel="manifest">`, and `theme-color` = `#C1502E` all present.
`manifest.webmanifest` fetched and diffed against the expected shape.
The `Loader` was screenshotted in two Playwright contexts — default
(GIF playing) and `reducedMotion: 'reduce'` (confirmed
`matchMedia('(prefers-reduced-motion: reduce)').matches === true` and
the DOM swapped to `wasla-splash-static.png`).
