# Wasla (وصلة)

Sudanese products, delivered in Cairo. Wasla is a multi-vendor marketplace where real Sudanese shops in Cairo and Giza list their own inventory and fulfill their own orders — coffee, spices, tea, dried goods, heritage clothing, and handicrafts, delivered same-day inside covered zones.

Migrated in place from an earlier UAE vape-marketplace codebase (Tobaki) — the architecture (master catalog + per-shop listings, role-based dashboard, order/review models, media uploads, auth) is domain-agnostic and carried over unchanged; only the domain, brand, and Egypt-specific features are new. See `MIGRATION_REPORT.md` for the full history of that migration and `DECISIONS.md`/`PROGRESS.md` for the reasoning behind specific calls made along the way.

The storefront follows a quick-commerce pattern (category-grid home, inline quick-add tiles, persistent cart bar) rather than a traditional detail-page-first e-commerce flow — see the "STOREFRONT REBUILD" entry in `PROGRESS.md`.

## Stack

- **Next.js 16** (App Router), React 19
- **PostgreSQL** on Neon, via **Prisma**
- **NextAuth** (Google OAuth) + JWT sessions for email/password
- **Cloudinary** for product photos and payment receipts
- **Tailwind CSS 4**

## Domain model

- `SellerProfile` — a shop (naming carried over from the pre-migration codebase; user-facing copy says "Shop" everywhere)
- `MasterProduct` + `RetailerProduct` — a canonical catalog product a shop can claim, price, and stock independently of other shops selling the same item
- `Product` + `ProductVariant` — products a shop lists directly (pack size / clothing size via the generic `label` field on `ProductVariant`)
- `DeliveryZone` + `ShopZoneCoverage` — which Cairo/Giza areas are covered, and each shop's fee/minimum-order/cutoff-time per zone
- `Address` — Egypt-shaped delivery address (governorate/district/street/building/floor/apartment/landmark)
- `Order` — status flow `PLACED → SHOP_CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED | CANCELLED`; a multi-shop checkout splits into one `Order` per shop sharing an `orderGroupId`

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate deploy
npm run seed                  # demo categories, 3 shops, ~27 products, 8 delivery zones
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo accounts after seeding: `admin@wasla.com` / `admin1234`, and three shop accounts (`seller@wasla.com`, `seller2@wasla.com`, `seller3@wasla.com`) — passwords in `scripts/seed.js`.

## Payments

Cash on Delivery works end to end today. InstaPay/Vodafone Cash manual transfer works (receipt upload + admin confirmation). Paymob (cards/wallets) is stubbed behind `PAYMOB_API_KEY`/`PAYMOB_INTEGRATION_ID`/`PAYMOB_IFRAME_ID` — see `lib/payments/paymob.js`.

## Feature flags

- `NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED` (default `false`) — seller subscription fees are built but shelved; every shop is free-tier until there's enough supply on the platform to justify a fee.

## Scripts

- `npm run dev` / `npm run build` / `npm run start` / `npm run lint`
- `npm run seed` — idempotent demo data seed (`scripts/seed.js`)
