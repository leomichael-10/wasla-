# Home Redesign + Bottom Tab Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the customer home page with the approved Arabic-first/RTL design and give every customer-facing page a redesigned, persistent bottom tab bar.

**Architecture:** `app/page.js` stays a server component that fetches data (zone, popular products) and composes six new presentational section components under `components/home/`. The global bottom nav (`components/MobileTabBar.js`) is restyled and reordered in place — its icon set already matches the spec 1:1, so this is a targeted edit, not a rewrite. Two small listing pages (`/categories`, `/restaurants`) are added so the new nav/cards never 404; they call the two existing-but-unused public APIs (`/api/categories`, `/api/restaurants`) — no new API routes. `/account` is a `next.config.mjs` redirect to the existing `/profile` page rather than a duplicate account page.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (CSS-variable theme in `app/globals.css`), Prisma — no new dependencies.

**Spec:** the pasted design brief in this conversation (no separate file; copied verbatim into task bodies below where exact copy/values matter).

## Global Constraints

- Frontend only — no Prisma schema changes, no new `app/api/*` route handlers.
- RTL / logical properties only: `margin-inline`, `padding-inline`, `inset-inline`, `ms-`/`me-`/`ps-`/`pe-` Tailwind utilities — never `left`/`right`/`ml-`/`mr-` etc.
- Any Latin-script name (the "Wasla" wordmark, a product's English name if it ever renders) is wrapped in `<bdi>`.
- Palette additions live in `app/globals.css` as literal `--wasla-orange` / `--wasla-orange-deep` / `--wasla-cream` / `--wasla-card` vars (spec's exact names), re-exposed as Tailwind color tokens so `bg-wasla-orange` etc. work.
- Must look correct at 390px width first; larger breakpoints scale up, they don't get a different layout.
- Keep every existing route working. `/account`, `/categories`, `/restaurants` are new; nothing existing is removed or renamed.
- No test runner exists in this repo (confirmed: no Jest/Vitest/Playwright in `package.json`). Verification = `npx next build` plus a manual dev-server check at 390px width, matching this repo's own established gate (see `PROGRESS.md` history) — not a new test framework.

## Review Focus

- **Out-of-stock / closed-shop / out-of-zone best-seller items**: tapping "أضف للسلة" on a product with no in-stock variant must not throw — `BestSellerCard` must guard exactly like `components/ProductTile.js` already does, not assume every popular product is purchasable.
- **Empty states**: `/categories` and `/restaurants` must render a real empty state (not a blank grid) when their API returns zero rows — both existing customer-facing categories are seeded today, but the page must not assume that stays true.
- **Bottom tab bar on auth/seller/admin routes**: `/forgot-password`, `/reset-password`, `/verify-email` are not in today's `HIDDEN_PREFIXES` — the spec's "not on... auth pages" must cover these too, or a half-logged-in user sees a customer nav bar mid password-reset.
- **Guest (logged-out) visitors**: the account tab now links straight to `/account` → `/profile`, and `/profile` immediately `router.replace('/login?redirect=/profile')` for a guest — confirm that bounce still lands on login (it does, by existing code) rather than erroring, since the tab bar no longer offers a login affordance of its own (the old sheet had one).
- **RTL grid order after reordering tabs**: the 5-column grid relies on `dir="rtl"` auto-placement; confirm visually that markup order `[cart, categories, home, orders, account]` renders right-to-left as cart→categories→home→orders→account, not mirrored.
- **Best-sellers rail scroll direction in English mode**: the rail is a `flex overflow-x-auto` row that currently relies on the ambient `dir` to scroll the intuitive way; since the home page is now fully bilingual (not forced RTL — see revision below), confirm it still scrolls right-to-left in Arabic and left-to-right in English, not stuck mirrored from one locale.

---

## Design decisions made while planning (flagged for review, not re-litigated per task)

1. **Old home-page sections are replaced, not kept.** "Redesign the home page" + an approved 6-section mockup is read as a full replacement of the current shops rail / restaurants rail / category grid / origin-region rails / Buy Again rail — not additions. Their data-fetching helpers in `app/page.js` (`getShops`, `getCategories`, `getRestaurants`, `getOriginRails`) are deleted as dead code; `getPopularProducts` + `annotateWithZone` are kept (feeds the new best-sellers rail, per the "reuse the existing catalogue query" instruction). The shared components these helpers used only for the old home page (`ProductTile` for origin rails, `BuyAgainRail`) stay in the codebase untouched — they're reused by other pages — only the now-dead local functions inside `app/page.js` go.
2. **The new header (bell/logo/location) is mobile-only.** `<Navbar />` + `<ZoneBar />` are removed from the home page on small screens (replaced by the new header) but kept at `lg:` and up, so desktop retains top nav, search, login/register and a working zone switcher. The new header + sections render at every width ("scale up gracefully"); the old `Navbar`/`ZoneBar` pair is simply hidden below `lg:` on this one page. This is the one place the plan diverges from "frontend only" being silent on it — flagged because removing desktop nav entirely was judged a worse regression than keeping two header systems split by breakpoint.
3. **`/account` is a redirect, not a page.** `account.*` i18n keys and the full account UI already live at `/profile` (personal info, addresses, password, delete account). Building a second page would duplicate it. A `next.config.mjs` redirect (`/account` → `/profile`) satisfies the spec's literal href and keeps a single source of truth.
4. **`/categories` and `/restaurants` are new, intentionally minimal listing pages**, not pixel-specced (the brief only specifies them as link targets, not screens). They reuse the existing, currently-unused `GET /api/categories` and `GET /api/restaurants` route handlers and copy the visual pattern already established by `app/shops/page.js`. Flagged because this is the one place the plan does more than the two literal deliverables (home page + tab bar) ask for — done to avoid a persistent, global nav bar with two dead links.

**Revision after review — two calls rejected, both now fixed below (Tasks 4–6):**

- ~~Bottom tab bar stays bilingual; the new home page content does not (hardcoded Arabic, forced `dir="rtl"`).~~ **Rejected.** The home page must be bilingual like the rest of the app and respect the existing `wasla_locale` cookie — no page-level exception. Every new string goes through `t()`/`lib/i18n.js` with both `ar` and `en` values (supplied below in Task 4), and `dir` is computed from `locale` exactly as `app/layout.js` already does, not forced.
- ~~Best-seller price always renders as "EGP 45".~~ **Rejected.** Use the app's existing `formatPrice(price, locale)` — "45 ج.م" in Arabic, its English equivalent in English. No second price format.

---

### Task 1: Design tokens

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: Tailwind color utilities `bg-wasla-orange`, `text-wasla-orange`, `bg-wasla-orange-deep`, `text-wasla-orange-deep`, `bg-wasla-cream`, `bg-wasla-card` — every later task's components rely on these exact class names.

- [ ] **Step 1: Add the literal spec vars to `:root`** (after the existing `--color-sand-*` lines, same block)

```css
--wasla-orange:      #F26522;
--wasla-orange-deep: #D94F12;
--wasla-cream:       #FDF4E7;
--wasla-card:        #FFFFFF;
```

- [ ] **Step 2: Expose them as Tailwind tokens in the `@theme inline` block**

```css
--color-wasla-orange:      var(--wasla-orange);
--color-wasla-orange-deep: var(--wasla-orange-deep);
--color-wasla-cream:       var(--wasla-cream);
--color-wasla-card:        var(--wasla-card);
```

- [ ] **Step 3: Verify** — run `npm run build` (just needs to compile; Tailwind v4 generates utilities from `@theme`). Expected: build succeeds, no CSS errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Add wasla-orange/cream palette CSS vars for the home redesign"
```

---

### Task 2: Redesign the bottom tab bar

**Files:**
- Modify: `components/MobileTabBar.js`
- Modify: `lib/i18n.js`

**Interfaces:**
- Consumes: `--color-wasla-orange` / `--color-wasla-orange-deep` (Task 1).
- Produces: no change to the component's export signature (`export default function MobileTabBar()`, no props) — `app/layout.js` already imports and renders it, untouched.

- [ ] **Step 1: Update two Arabic dict values in `lib/i18n.js`** to match the approved copy exactly (English values are unaffected — the spec gives no English copy for this redesign):
  - `'tab.categories'` in the `ar` dict: `'التصنيفات'` → `'الأقسام'`
  - `'tab.orders'` in the `ar` dict: `'طلباتي'` → `'الطلبات'`

- [ ] **Step 2: Extend `HIDDEN_PREFIXES`** in `components/MobileTabBar.js` to cover every auth-flow page, not just login/register/onboarding:

```js
const HIDDEN_PREFIXES = ['/dashboard', '/admin', '/login', '/register', '/onboarding', '/forgot-password', '/reset-password', '/verify-email', '/auth']
```

- [ ] **Step 3: Reorder `tabs` and repoint `categories`/`account`.** Replace the `CATEGORIES_TAB` constant and `tabs` array with:

```js
const tabs = [
  { key: 'cart',       href: '/cart',       labelKey: 'tab.cart',       icon: 'cart',       badge: cartCount },
  { key: 'categories', href: '/categories', labelKey: 'tab.categories', icon: 'categories' },
  { key: 'home',       href: '/',           labelKey: 'tab.home',       icon: 'home',       center: true },
  { key: 'orders',     href: '/orders',     labelKey: 'tab.orders',     icon: 'orders' },
  { key: 'account',    href: '/account',    labelKey: 'tab.account',    icon: 'account' },
]
```

  Delete the now-unused `CATEGORIES_TAB` constant it replaces.

- [ ] **Step 4: Delete the `AccountSheet` function and its render call entirely**, and the `sheetOpen` state / `handleLogout`'s use as a sheet trigger. The account tab is now a plain `<Link>` like the other four, rendered by the same `tabs.map(...)` — delete the separate trailing `<button onClick={() => setSheetOpen(true)}>` block that currently renders the 5th tab by hand. (Logout, language toggle and PWA install already exist on `/profile`, reached via this tab — see plan decision 3 above — and PWA install also has its own independent global banner, `components/PWAInstall.js`.) Remove the now-unused imports this deletion leaves dangling (`onPromptAvailable`, `triggerInstall`, `isStandalone`, `isIos`, `setLocaleCookie`) if nothing else in the file still uses them.

- [ ] **Step 5: Restyle the nav shell** — rounded top corners, white background, soft shadow (spec's exact wording):

```jsx
className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]"
```

  (Drop the old `border-t border-brand-100`; the rounded corners + shadow replace it visually.)

- [ ] **Step 6: Restyle `TabIcon`'s color logic to neutral grey / wasla-orange**, and add a short active underline under the label. Change the active/inactive color classes from `text-accent-500`/`text-brand-400` to `text-wasla-orange`/`text-gray-400` (both in `TabIcon` and the label `<span>`), and add, directly under each tab's label, a small underline element shown only when active:

```jsx
<span className={`block h-[2px] w-4 rounded-full transition-colors duration-120 ${active ? 'bg-wasla-orange' : 'bg-transparent'}`} />
```

- [ ] **Step 7: Elevate the center (home) tab.** In the `tabs.map(...)` render, when `tab.center` is true: render a bigger icon (`w-7 h-7` instead of `w-6 h-6`) and translate the icon+label stack up 8px (`-translate-y-2`), keeping the same `<Link>` structure and active-state logic as the other four tabs — no separate markup path, just conditional classes.

- [ ] **Step 8: Recolor the cart badge** from `bg-accent-400` to `bg-wasla-orange` (same markup, new class) to match the new palette.

- [ ] **Step 9: Verify** — `npm run build` succeeds. Manual dev-server check at 390px width (see Task 8 for the full pass): the bar shows 5 items in RTL order cart→categories→home→orders→account, home is visibly raised with a bigger icon, the active tab is orange with an underline, inactive tabs are grey, and the bar has rounded top corners + shadow. Confirm the bar still disappears on `/login`, `/forgot-password`, `/dashboard`, `/admin`. Confirm the bar doesn't cover page content on a long page (e.g. `/orders`) — `app/layout.js`'s `<main className="pb-16 lg:pb-0">` already reserves exactly the bar's `h-16` height; this task doesn't change the bar's own height (the raised center item overflows upward via `-translate-y-2`, not by growing the container), so no change to `app/layout.js` is needed — just confirm visually that nothing is clipped.

- [ ] **Step 10: Commit**

```bash
git add components/MobileTabBar.js lib/i18n.js
git commit -m "Redesign bottom tab bar: reorder to spec, raise center item, repoint account/categories"
```

---

### Task 3: `/account` redirect

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Add a redirect** so the tab bar's `/account` href resolves to the existing account page:

```js
async redirects() {
  return [
    { source: '/account', destination: '/profile', permanent: false },
  ]
},
```

  (Place it alongside the existing `async headers()` function, both as properties of `nextConfig`.)

- [ ] **Step 2: Verify** — `npm run dev`, navigate to `/account`, confirm it lands on `/profile` (302).

- [ ] **Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "Redirect /account to the existing /profile page"
```

---

### Task 4: Static home-page section components (bilingual)

**Files:**
- Create: `components/home/HomeHeader.js`
- Create: `components/home/HomeSearchBar.js`
- Create: `components/home/HeroBanner.js`
- Create: `components/home/ModeCards.js`
- Create: `components/home/PlaceholderTiles.js`
- Modify: `lib/i18n.js`

**Interfaces:**
- Consumes: `locale` (`'ar' | 'en'`), passed as a prop from `app/page.js` (Task 6) — same pattern `categoryName(name, locale)` already uses elsewhere in this codebase.
- Produces: five default-exported components, each `({ locale })`, each returning one `<section>`/wrapper, composed by `app/page.js` in Task 6. None needs `'use client'` — no state, no event handlers (every interactive element here is a plain `<Link>`/`<a>`/native form); reading a prop and calling `t()` doesn't require it.

- [ ] **Step 1: Add i18n keys to `lib/i18n.js`** (both `ar` and `en` dicts, same section/style as the existing `home.*` keys):

```js
// ar
'home.searchPlaceholder':   'ابحث عن منتج، مطعم أو براند...',
'home.heroChip':            'وصلة ستور',
'home.heroHeadline':        'منتجات سودانية بجودة عالية',
'home.heroCta':              'تسوق الآن',
'home.modeRestaurantTitle':    'وصلة مود',
'home.modeRestaurantSubtitle': 'المطاعم والمأكولات',
'home.modeShopTitle':          'وصلة ستور',
'home.modeShopSubtitle':       'للبراندات والمتاجر السودانية',
'home.bestSellersHeading':  'الأكثر مبيعاً',
'home.reviewsTileTitle':    'تقييمات العملاء',
'home.reviewsTileSubtitle': 'شارك رأيك عن تجربتنا',
'home.reorderTileTitle':    'إعادة الطلب',
'home.reorderTileSubtitle': 'اطلب من طلباتك السابقة',

// en
'home.searchPlaceholder':   'Search for a product, restaurant or brand...',
'home.heroChip':            'Wasla Store',
'home.heroHeadline':        'High-quality Sudanese products',
'home.heroCta':              'Shop now',
'home.modeRestaurantTitle':    'Wasla Mood',
'home.modeRestaurantSubtitle': 'Restaurants & food',
'home.modeShopTitle':          'Wasla Store',
'home.modeShopSubtitle':       'Sudanese brands & shops',
'home.bestSellersHeading':  'Best sellers',
'home.reviewsTileTitle':    'Customer reviews',
'home.reviewsTileSubtitle': 'Share your experience',
'home.reorderTileTitle':    'Reorder',
'home.reorderTileSubtitle': 'Order from your past orders',
```

  Also correct `'product.addToCart'` in the `en` dict from `'Add to Cart'` to `'Add to cart'` (sentence case, per the approved copy list — this key is shared with `app/products/[id]/page.js`'s existing add-to-cart button, so that page's button label changes case too; that's an intended, harmless side effect of using the one shared key rather than a duplicate).

  The city name in the header ("القاهرة"/"Cairo") doesn't need a new key — reuse the existing `placeName('Cairo', locale)` helper, already in `lib/i18n.js`.

  Nav tab labels need no new keys — `tab.cart`/`tab.categories`/`tab.home`/`tab.orders`/`tab.account` already exist and already read "Cart/Categories/Home/Orders/Account" in `en` (Task 2 only touches two `ar` values).

- [ ] **Step 2: `components/home/HomeHeader.js`** — `({ locale })`. Bell (static unread dot, non-functional button, no `onClick`) on the inline-start side, centered `<bdi><Wordmark /></bdi>` logo (reuse `components/Wordmark.js`), location picker pill on the inline-end side showing `placeName('Cairo', locale)` + map-pin icon + chevron, a plain non-functional `<button>` (no `onClick`) per the spec. Use `ps-`/`pe-`/`gap-` logical utilities, `justify-between`, cream/orange-tinted icons consistent with the new palette (e.g. bell and pin in `text-wasla-orange-deep` on a `bg-wasla-cream` page).

- [ ] **Step 3: `components/home/HomeSearchBar.js`** — `({ locale })`. A plain `<form action="/products" method="get">` with a single `<input type="text" name="search" placeholder={t('home.searchPlaceholder', locale)} />`, rounded, `bg-wasla-cream`, magnifier icon (reuse the existing magnifier path already used in `app/shops/page.js`/`components/Navbar.js`). No JS required — native GET form submit produces `/products?search=...`, which is the param `app/products/page.js` already reads (the spec's own `?q=` notation is approximate; `search` is what this codebase's `/products` page actually consumes — using `q` would silently return unfiltered results).

- [ ] **Step 4: `components/home/HeroBanner.js`** — `({ locale })`. `<Link href="/products">` wrapping an orange-gradient (`from-wasla-orange to-wasla-orange-deep`) card, `rounded-[24px]`, containing: a white pill chip `t('home.heroChip', locale)` with a trailing chevron (`rtl:-scale-x-100` on the chevron, matching the existing chevron-flip convention in `app/shops/page.js` — this flips correctly in both locales because it keys off the ambient `dir`, not a hardcoded assumption), the headline `t('home.heroHeadline', locale)` (wraps to two lines naturally at 390px; not a forced line break — the English string is shorter and may render on one line, which is fine), and a white CTA pill button `t('home.heroCta', locale)` with a circular-arrow icon.

- [ ] **Step 5: `components/home/ModeCards.js`** — `({ locale })`. A two-column `grid grid-cols-2 gap-3` of two `<Link>` cards, both `bg-wasla-orange` rounded cards with a circular white icon badge + chevron:
  - `/restaurants` — fork-and-knife icon, title `t('home.modeRestaurantTitle', locale)`, subtitle `t('home.modeRestaurantSubtitle', locale)`
  - `/shops` — storefront icon, title `t('home.modeShopTitle', locale)`, subtitle `t('home.modeShopSubtitle', locale)`

- [ ] **Step 6: `components/home/PlaceholderTiles.js`** — `({ locale })`. A two-column grid of two static `<a href="#">` tiles, `bg-wasla-cream` background, white circular icon badge, no `onClick`/behavior:
  - a chat/review-bubble icon, title `t('home.reviewsTileTitle', locale)`, subtitle `t('home.reviewsTileSubtitle', locale)`
  - a refresh/reorder icon, title `t('home.reorderTileTitle', locale)`, subtitle `t('home.reorderTileSubtitle', locale)`

- [ ] **Step 7: Verify** — these aren't wired into a page yet; a quick visual check happens in Task 6's verification once `app/page.js` composes them. No standalone step here beyond confirming each file exports valid JSX (`npm run build` will catch syntax errors once Task 6 imports them).

- [ ] **Step 8: Commit** (bundle with Task 6's commit — these five files have no independent page to render them, so there's nothing to verify in isolation; see Task 6 Step 4 for the combined commit).

---

### Task 5: Best-sellers rail (interactive)

**Files:**
- Create: `components/home/BestSellerCard.js`
- Create: `components/home/BestSellerRail.js`

**Interfaces:**
- Consumes: a `product` shaped like `toCatalogueProducts()`'s output from `lib/catalogue.js` (`variants[]` with `inStock`/`price`, `seller.isOpen`, `seller.deliversToZone`, `images[]`) — the same shape `components/ProductTile.js` already consumes, produced today by `app/page.js`'s existing `getPopularProducts()`. Also consumes `locale` (`'ar' | 'en'`), passed down from `app/page.js` through `BestSellerRail` into `BestSellerCard`.
- Produces: `BestSellerRail({ products, locale })` (default export, `'use client'` not required at this level — it just maps and renders `BestSellerCard`s in a scroll container; the heading comes from `t('home.bestSellersHeading', locale)`, Task 4's new key) and `BestSellerCard({ product, locale })` (default export, `'use client'` — calls `addToCart` from `lib/cart.js`).

- [ ] **Step 1: `components/home/BestSellerCard.js`** — `'use client'`. Mirror `components/ProductTile.js`'s guard logic (shop closed / out of zone / no in-stock variant) but with the spec's visual treatment instead of ProductTile's stepper:
  - Square image on `bg-wasla-cream` (reuse `components/MediaThumb.js`, `className="aspect-square"`).
  - `<bdi>{productName(product, locale)}</bdi>` for the name (`productName()` already falls back to Arabic when English is empty, same as everywhere else in the app).
  - Price via `formatPrice(price, locale)` — the app's existing formatter, "45 ج.م" in Arabic / its English form in English (plan revision: no second price format), styled `text-wasla-orange font-black`.
  - Full-width button, `bg-wasla-orange text-white`, label `t('product.addToCart', locale)` + cart icon (reuse the cart path from `components/MobileTabBar.js`'s `TabIcon`), calling `addToCart(...)` from `lib/cart.js` with the same item shape `ProductTile.js` builds (`productVariantId`, `productId`, `productName`, `productNameEn`, `image`, `brand`, `label`, `price`, `quantity: 1`, `sellerId`, `sellerName`). On success, `toast.success(t('product.addedToCart', locale))` (reuses an existing i18n key, `sonner`'s `toast` already a project dependency).
  - When `unavailable` (shop closed or out-of-zone) or no in-stock variant: disable the button and show the existing `browse.outOfStock` / shop-closed text instead, same as `ProductTile.js` — this is the Review Focus item for this task.

- [ ] **Step 2: `components/home/BestSellerRail.js`** — plain function, no `'use client'` needed (no hooks of its own): renders a `<section>` with heading `🔥 {t('home.bestSellersHeading', locale)}` (the fire emoji is decorative and locale-independent, kept outside the translated string), returns `null` if `products.length === 0` (same "hide empty rail" convention as the old `RestaurantSection`/`ShopSection`), and a horizontally-scrolling `flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide` row of `<div className="snap-start w-40 shrink-0">` wrapping each `BestSellerCard`. Scroll direction needs no extra code — `overflow-x-auto` on a row already honors the ambient `dir` (inherited from `<html dir>`, set from the locale cookie in `app/layout.js`), the same mechanism every other horizontal rail in this codebase (e.g. the old `ProductRail`) already relied on; just confirm it in Task 8's bilingual check (this task's added Review Focus item).

- [ ] **Step 3: Verify** — deferred to Task 6/8 for the normal-case render (needs real product data from `app/page.js`). Specifically re-check this task's Review Focus item once wired up in Task 8: find or temporarily simulate (e.g. in React DevTools, flip `seller.isOpen` to `false` on one popular product in the browser console) a closed-shop/out-of-zone/no-stock product and confirm its card disables the button and shows the fallback text instead of throwing when tapped — don't rely on today's seed data happening to contain one.

- [ ] **Step 4: Commit** — bundled with Task 6 (see below).

---

### Task 6: Compose the new home page

**Files:**
- Modify: `app/page.js`

**Interfaces:**
- Consumes: `HomeHeader`, `HomeSearchBar`, `HeroBanner`, `ModeCards`, `BestSellerRail`, `PlaceholderTiles` (Tasks 4–5).

- [ ] **Step 1: Delete dead code** — remove `getShops`, `getCategories`, `getRestaurants`, `getOriginRails`, `CategoryTile`, `RestaurantTile`, `RestaurantSection`, `ShopTile`, `ShopSection`, `ProductRail`, and the `Navbar`/`ZoneBar`/`BuyAgainRail`/`CategoryIcon`/`MediaThumb` imports they alone required. Keep `getPopularProducts` and `annotateWithZone` (and the `CATALOGUE_WHERE`/`CATALOGUE_INCLUDE`/`toCatalogueProducts` imports they need) unchanged — this is the "reuse the existing catalogue query" rail's data source.

- [ ] **Step 2: Keep `Navbar`/`ZoneBar` for desktop only.** Re-add the two imports just for this (`Navbar`, `ZoneBar`), and wrap their render in `<div className="hidden lg:block"><Navbar /><ZoneBar /></div>` (plan decision 2).

- [ ] **Step 3: Rewrite the default export** to compose, in order, passing `locale` to every section — no forced `dir`; the page keeps relying on `<html dir>` (already set from the `wasla_locale` cookie in `app/layout.js`), exactly like every other page in the app:

```jsx
export default async function HomePage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE

  let zoneId = null
  try {
    const raw = cookieStore.get('wasla_zone')?.value
    if (raw) zoneId = JSON.parse(decodeURIComponent(raw))?.id ?? null
  } catch { /* ignore malformed cookie */ }

  const popular = await getPopularProducts(zoneId)

  return (
    <div className="bg-wasla-cream pb-20">
      <div className="hidden lg:block"><Navbar /><ZoneBar /></div>
      <HomeHeader locale={locale} />
      <HomeSearchBar locale={locale} />
      <HeroBanner locale={locale} />
      <ModeCards locale={locale} />
      <BestSellerRail products={popular} locale={locale} />
      <PlaceholderTiles locale={locale} />
    </div>
  )
}
```

  (Keep the `DEFAULT_LOCALE, LOCALE_COOKIE` imports from `lib/i18n.js` that the original file already had — they're still needed for this cookie read.)

- [ ] **Step 4: Commit** (bundles Tasks 4, 5 and 6 — the five static components, the two best-seller files, and `app/page.js` together, since none of them has an independent render target before this wiring):

```bash
git add app/page.js components/home
git commit -m "Redesign the customer home page to the approved Arabic-first layout"
```

---

### Task 7: `/categories` and `/restaurants` listing pages

**Files:**
- Create: `app/categories/page.js`
- Create: `app/restaurants/page.js`
- Modify: `lib/i18n.js`

**Interfaces:**
- Consumes: existing `GET /api/categories` (`{ categories: [{ id, name, icon, isInternal, subCategories }] }`), existing `GET /api/restaurants` (`{ restaurants: [{ id, businessName, city, area, isOpen, image, dishCount }] }`). No new API routes.

- [ ] **Step 1: Add i18n keys** to `lib/i18n.js` (both `ar` and `en` dicts), following the existing `shops.*` naming pattern: `categories.pageTitle` ("الأقسام" / "Categories"), `categories.empty` ("لا توجد أقسام" / "No categories yet"), `restaurants.pageTitle` ("المطاعم" / "Restaurants"), `restaurants.empty` ("لا توجد مطاعم" / "No restaurants yet"). Reuse the existing `shops.home` key for the breadcrumb's "Home" link text on both new pages (already "الرئيسية" / "Home").

- [ ] **Step 2: `app/categories/page.js`** — client component (`'use client'`), same page chrome as `app/shops/page.js` (Navbar, breadcrumb using `shops.home` + `categories.pageTitle`), `useEffect` fetch of `/api/categories`, render a `grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3` of cards reusing `components/CategoryIcon.js` + `categoryName()` from `lib/i18n.js`, each linking to `/products?category=${encodeURIComponent(name)}` (same href pattern the old home-page `CategoryTile` used). Empty state renders `categories.empty` when the fetched array is length 0 — this task's Review Focus item.

- [ ] **Step 3: `app/restaurants/page.js`** — client component, same chrome pattern, `useEffect` fetch of `/api/restaurants`, render a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` of cards (reuse `components/MediaThumb.js` for `image`, show `businessName`, `city`/`area` via `placeName()`, an open/closed badge from `isOpen`, `dishCount`), each linking to `/restaurant/${id}` (existing singular route). Empty state renders `restaurants.empty` when the array is length 0.

- [ ] **Step 4: Verify** — `npm run dev`, navigate to `/categories` and `/restaurants`, confirm both render real data (today's seeded categories/restaurants) and that the bottom tab bar's "الأقسام" tab and the home page's "وصلة مود" card land on them correctly. Confirm the empty-state branch by reading it back against the fetch logic (code review, not a forced-empty live check — there's no mock/test infra in this repo and seeding an empty category/restaurant table isn't worth the data risk for a UI check): the `.length === 0` condition must be reachable whenever the fetch resolves with an empty array, independent of today's seed data.

- [ ] **Step 5: Commit**

```bash
git add app/categories app/restaurants lib/i18n.js
git commit -m "Add minimal /categories and /restaurants listing pages"
```

---

### Task 8: Full verification pass + PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: `npm run build`** — must succeed with no type/lint errors.

- [ ] **Step 2: Manual browser pass at 390px width** (dev server): home page top-to-bottom matches the six specced sections; bottom tab bar visible and correctly ordered/styled on `/`, `/products`, `/cart`, `/orders`, `/shops`, `/restaurants`, `/categories`, `/profile`; bottom tab bar **absent** on `/login`, `/register`, `/forgot-password`, `/onboarding`, `/dashboard`, `/admin`; `/account` redirects to `/profile`; best-seller "أضف للسلة" updates the cart badge; search bar submits to `/products?search=...`; every nav target resolves (no 404s). Also check the logged-out path specifically (Review Focus item): while logged out, tap "حسابي" — it should go `/account` → `/profile` → bounce to `/login?redirect=/profile`, not error or dead-end, since the tab bar no longer has its own login affordance.

- [ ] **Step 3: Desktop check (≥1024px)**: home page shows `Navbar` + `ZoneBar` at the top, sections scale up without breaking, bottom tab bar absent (existing `lg:hidden` behavior, unchanged).

- [ ] **Step 4: Bilingual check, both widths.** Toggle the language (the existing toggle on `/profile` or desktop `Navbar`), reload `/`: every new string on the home page switches to its English value from Task 4's dict additions (search placeholder, hero chip/headline/CTA, both mode cards, "Best sellers" heading, "Add to cart", both placeholder tiles); layout flips to LTR and still looks correct (chevrons point the right way, no clipped/overlapping text); the best-sellers rail scrolls left-to-right in English and right-to-left in Arabic (this task's and Task 5's Review Focus item). Bottom tab bar labels already switch correctly (existing `t()` usage, confirmed in Task 2).

- [ ] **Step 5: Append a `## Customer home page redesign + bottom tab bar` section to `PROGRESS.md`**, following the file's existing format (prose + a closing `**Gate**:` line). Cover: what changed, the four flagged decisions from the plan header (old sections replaced not kept; desktop keeps Navbar/ZoneBar; `/account` redirect; new minimal `/categories`/`/restaurants` pages), the two calls that were proposed and then rejected on review (a forced-Arabic home page, and a literal "EGP" price format — both now fully bilingual / using the app's real formatter instead), the `product.addToCart` English casing fix, and the `?q=` → `?search=` correction. End with `**Gate**: \`npx next build\` ✅. No schema change.`

- [ ] **Step 6: Commit**

```bash
git add PROGRESS.md
git commit -m "Document home redesign + bottom tab bar work in PROGRESS.md"
```
