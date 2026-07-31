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
