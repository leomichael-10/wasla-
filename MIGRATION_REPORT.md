# MIGRATION_REPORT.md — Tobaki → Wasla

Final report for the Phase 0–8 migration. See `MIGRATION_AUDIT.md` for the original Phase 0 audit, `DECISIONS.md` for ambiguous calls made during autonomous execution, and `PROGRESS.md` for the running per-phase changelog this report summarizes.

## What changed, by phase

**Phase 0/1 — Audit + brand/domain strip.** Tobaki → Wasla everywhere (metadata, storage keys, footer, emails). Deleted the 21+ age-verification flow and `User.ageVerified`. Dropped the standalone vape SKU tables (`Vape`/`Sparepart`/`Dokha`/`Cigarette`/`Disposable`), their admin screen, and a dead Excel-import seed script. Collapsed `ProductVariant`'s five vape-only fields into one generic `label` field. Shelved seller subscriptions behind `NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=false` rather than deleting the feature. Rewrote terms/privacy for Egypt.

**Phase 2 — Schema migration.** Fresh migration history on the disposable dev database (no data preserved, by instruction). Added `Product` unit/perishability/heritage fields, `Address`, `DeliveryZone`, `ShopZoneCoverage`, `DeliveryWaitlist`. Added `Order.orderGroupId`/`zoneId`/`addressId`/`deliveryFee`/`promisedEta`/`currency`. Renamed every currency-suffixed field (`priceAed`→`price`, etc.) to bare names.

**Phase 3 — Category tree + seed.** 11 categories/33 subcategories matching the brief's taxonomy, 3 demo shops, 27 demo products with EGP pricing, tagged `DEMO-` in `skuCode` for easy wipe.

**Phase 4 — Same-day Cairo delivery.** 8 launch zones seeded with AR/EN names, fee, ETA. A first-visit zone-gate modal (cookie-based) with an out-of-zone waitlist. `GET /api/delivery/quote` resolves fee/ETA/min-order per shop×zone, shared between the cart and server-side order validation. Cart splits fee/ETA per shop and shares an `orderGroupId` across a multi-shop checkout. Renamed the order status lifecycle to `PLACED → SHOP_CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED | CANCELLED`.

**Phase 5 — Egypt payments.** A real `PaymentProvider` interface (`lib/payments/`) with three implementations: Cash on Delivery (default, fully working), manual InstaPay/Vodafone Cash transfer (receipt upload + admin confirm), and a genuinely-stubbed Paymob provider that throws a clear "not configured" error rather than faking success.

**Phase 6 — Arabic-first i18n/RTL.** A dictionary-based `t()` helper, Arabic as the default locale, `<html lang/dir>` driven by a locale cookie, the Cairo Arabic font, an AR/EN Navbar toggle, and Egyptian phone validation. Translated the highest-traffic surfaces (layout, Navbar, homepage hero, ZoneGate, cart) — **not** an exhaustive translation of every string in every route (see "What's stubbed" below).

**Phase 7 — Shop dashboard.** Self-service delivery-zone coverage (toggle, fee override, min order, cutoff time) at `/dashboard/settings`, an open/closed shop toggle that hides a closed shop's products from general listings without deleting them, and a polling-based new-order indicator (chime + pulsing badge) on the order queue.

**Phase 8 — Cleanup.** Expanded terms.js with a food-safety disclaimer section. Added `app/sitemap.js` and `app/robots.js`. Added Product/GroceryStore JSON-LD structured data to product and shop detail pages. Fixed two leftover vape-era placeholder strings (`Elf Bar`) and the stale package name in `package-lock.json`. Rewrote `README.md` from the untouched `create-next-app` boilerplate.

## What's stubbed or incomplete

- **Paymob** — no credentials exist; `lib/payments/paymob.js` is a real interface implementation with the exact API call sequence commented inline, but returns a clear "not configured" error rather than processing payments. Needs `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_IFRAME_ID`.
- **`SellerProfile` → `Shop` rename** — deferred (logged in DECISIONS.md). The Prisma model/field name is still `SellerProfile`/`sellerId`; all user-facing copy says "Shop." A full rename touches ~50+ files and was judged too high-blast-radius for unattended execution without human review between steps.
- **Full-app Arabic translation** — dashboard, admin, and product-detail pages remain English-only. Infrastructure (dictionary, RTL, font, locale toggle) is real and working; content coverage is partial by deliberate scope decision (logged in DECISIONS.md).
- **Product listing zone-awareness** — `/browse`, `/products`, and the homepage do not grey out or hide products from shops outside the visitor's selected delivery zone (only the cart enforces zone coverage today, at checkout).
- **Real-time order notifications** — the dashboard order queue polls every 20 seconds rather than using WebSockets/SSE.
- **Zone boundaries** — `DeliveryZone.districts` is a flat string list (e.g. `["Faisal"]`), not real geographic polygons. Fine for the 8 launch zones' current one-district-each shape; won't scale to multi-district zones without a real polygon/geocoding solution.
- **`SellerProfile.subscriptionStatus` / commission monetization** — kept exactly as-is, gated by the `NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED` flag, per your explicit instruction to shelve rather than build or delete.

## What you need to supply

1. **Paymob API keys** (`PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_IFRAME_ID`) once you're ready to accept card/wallet payments.
2. **Real shop data** — the 3 demo shops and 27 demo products (all `skuCode`-prefixed `DEMO-`) need replacing with actual Sudanese shops in Cairo/Giza. Wipe via:
   ```js
   prisma.productVariant.deleteMany({ where: { skuCode: { startsWith: 'DEMO-' } } })
   // then delete now-childless products, and the 3 demo SellerProfile/User rows
   ```
3. **Logo / brand assets** — no Wasla logo exists yet; the wordmark is still text-only (`was<span>la</span>`) everywhere. `public/` only has the original Next.js placeholder SVGs.
4. **Delivery zone polygons** — if you want real geofencing instead of the current flat district-name list, you'll need actual zone boundary data (GeoJSON or similar) and a point-in-polygon check at checkout.
5. **A decision on the `SellerProfile`→`Shop` rename** — worth doing as a dedicated, reviewed pass rather than folding into more unattended phases, given the blast radius.
6. **Neon branch cleanup** — this migration ran against a disposable dev database (`ep-silent-frost-axbvo9ct-pooler`); confirm this is the intended long-term database, or point `DATABASE_URL` at production infrastructure when ready.
