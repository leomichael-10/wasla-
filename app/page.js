import Link from 'next/link'
import { cookies } from 'next/headers'
import { prisma } from '../lib/prisma'
import Navbar from '../components/Navbar'
import ZoneBar from '../components/ZoneBar'
import ProductTile from '../components/ProductTile'
import BuyAgainRail from '../components/BuyAgainRail'
import CategoryIcon from '../components/CategoryIcon'
import { DEFAULT_LOCALE, LOCALE_COOKIE, t, categoryName } from '../lib/i18n'

async function getCategories() {
  try {
    const cats = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      // Restaurant dishes never count toward category totals — they live
      // only in the Restaurants section, not "Shop by Category".
      include: { _count: { select: { products: { where: { isActive: true, seller: { sellerType: 'SHOP' } } } } } },
    })
    return JSON.parse(JSON.stringify(cats))
  } catch { return [] }
}

async function getRestaurants() {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where:   { sellerType: 'RESTAURANT', approvedByAdmin: true },
      orderBy: { businessName: 'asc' },
      take:    12,
      include: { products: { where: { isActive: true }, select: { images: true } } },
    })
    const restaurants = sellers.map(s => ({
      id:           s.id,
      businessName: s.businessName,
      city:         s.city,
      area:         s.area,
      isOpen:       s.isOpen,
      image:        s.products.find(p => p.images?.length)?.images?.[0] ?? null,
    }))
    return JSON.parse(JSON.stringify(restaurants))
  } catch { return [] }
}

async function annotateWithZone(rawProducts, zoneId) {
  let coverageMap = {}
  if (zoneId) {
    const sellerIds = [...new Set(rawProducts.map(p => p.sellerId))]
    const coverage  = await prisma.shopZoneCoverage.findMany({
      where: { zoneId, sellerId: { in: sellerIds }, isActive: true },
    })
    coverageMap = Object.fromEntries(coverage.map(c => [c.sellerId, true]))
  }
  return rawProducts.map(p => ({
    ...p,
    seller: { ...p.seller, deliversToZone: zoneId ? Boolean(coverageMap[p.sellerId]) : undefined },
  }))
}

// sellerType: 'SHOP' keeps restaurant dishes out of these general product
// rails — restaurants surface only in the Restaurants section + their pages.
const PRODUCT_SELECT = {
  variants: {
    select: { id: true, label: true, price: true, stockQty: true },
    orderBy: { label: 'asc' },
  },
  seller:   { select: { id: true, businessName: true, city: true, isOpen: true } },
  category: { select: { id: true, name: true } },
}

async function getPopularProducts(zoneId) {
  try {
    const raw = await prisma.product.findMany({
      where:   { isActive: true, seller: { isOpen: true, sellerType: 'SHOP' } },
      orderBy: { createdAt: 'desc' },
      take:    10,
      include: PRODUCT_SELECT,
    })
    return JSON.parse(JSON.stringify(await annotateWithZone(raw, zoneId)))
  } catch { return [] }
}

async function getOriginRails(zoneId) {
  try {
    const regions = await prisma.product.findMany({
      where:    { isActive: true, seller: { isOpen: true, sellerType: 'SHOP' }, originRegion: { not: null } },
      distinct: ['originRegion'],
      select:   { originRegion: true },
      take:     4,
    })

    const rails = []
    for (const { originRegion } of regions) {
      const raw = await prisma.product.findMany({
        where:   { isActive: true, seller: { isOpen: true, sellerType: 'SHOP' }, originRegion },
        take:    10,
        include: PRODUCT_SELECT,
      })
      rails.push({ originRegion, products: await annotateWithZone(raw, zoneId) })
    }
    return JSON.parse(JSON.stringify(rails))
  } catch { return [] }
}

function CategoryTile({ category, locale }) {
  return (
    <Link
      href={`/products?category=${encodeURIComponent(category.name)}`}
      className="group flex flex-col items-center gap-2 bg-white rounded-2xl border border-brand-100 shadow-sm hover:shadow-md hover:border-accent-300 hover:bg-accent-50 transition-all duration-200 py-4 px-2"
    >
      <span className="w-16 h-16 rounded-full bg-[#FBF6EF] flex items-center justify-center overflow-hidden">
        <CategoryIcon slug={category.icon} name={category.name} locale={locale} className="w-14 h-14" />
      </span>
      <span className="text-xs font-bold text-brand-800 text-center leading-tight group-hover:text-accent-500 transition-colors">
        {categoryName(category.name, locale)}
      </span>
      {category._count?.products > 0 && (
        <span className="text-[10px] text-gray-400">{category._count.products}</span>
      )}
    </Link>
  )
}

function RestaurantTile({ restaurant }) {
  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className="group w-40 shrink-0 bg-white rounded-2xl border border-brand-100 shadow-sm hover:shadow-md hover:border-accent-300 transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="aspect-square bg-linear-to-br from-brand-700 to-brand-500 flex items-center justify-center overflow-hidden">
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.businessName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <span className="text-3xl font-black text-white/90 select-none">
            {restaurant.businessName[0].toUpperCase()}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 min-h-8">{restaurant.businessName}</p>
        {(restaurant.area || restaurant.city) && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{[restaurant.area, restaurant.city].filter(Boolean).join(', ')}</p>
        )}
      </div>
    </Link>
  )
}

function RestaurantSection({ restaurants, locale }) {
  if (restaurants.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 pt-6 pb-2">
      <h2 className="text-lg font-black text-gray-900 mb-3">{t('home.restaurants', locale)}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {restaurants.map(restaurant => (
          <RestaurantTile key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </section>
  )
}

function ProductRail({ title, products, viewAllHref, locale }) {
  if (products.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-brand-600 font-semibold text-xs hover:text-brand-800 transition-colors">
            {t('home.viewAll', locale)}
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {products.map(product => (
          <div key={product.id} className="w-36 shrink-0">
            <ProductTile product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE

  let zoneId = null
  try {
    const raw = cookieStore.get('wasla_zone')?.value
    if (raw) zoneId = JSON.parse(decodeURIComponent(raw))?.id ?? null
  } catch { /* ignore malformed cookie */ }

  const [categories, restaurants, popular, originRails] = await Promise.all([
    getCategories(),
    getRestaurants(),
    getPopularProducts(zoneId),
    getOriginRails(zoneId),
  ])

  return (
    <div className="min-h-screen bg-[#FBF6EF] pb-20">
      <Navbar />
      <ZoneBar />

      {/* Search */}
      <section className="bg-brand-700 px-4 py-4">
        <form action="/products" method="GET" className="max-w-2xl mx-auto">
          <div className="flex bg-white rounded-2xl shadow-lg overflow-hidden p-1">
            <input
              type="text"
              name="search"
              placeholder={t('home.searchPlaceholder', locale)}
              className="flex-1 px-4 py-2.5 text-gray-800 text-sm focus:outline-none bg-transparent placeholder-gray-400"
            />
            <button
              type="submit"
              className="bg-accent-400 hover:bg-accent-500 active:scale-95 text-gray-900 font-black px-5 py-2.5 rounded-xl text-sm transition-all duration-200 shrink-0"
            >
              {t('home.search', locale)}
            </button>
          </div>
        </form>
      </section>

      {/* Restaurants — separate from product categories; hidden until one exists */}
      <RestaurantSection restaurants={restaurants} locale={locale} />

      {/* Category grid — the primary navigation surface */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <h2 className="text-lg font-black text-gray-900 mb-3">{t('home.categories', locale)}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map(cat => (
              <CategoryTile key={cat.id} category={cat} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <ProductRail title={t('home.mostPopular', locale)} products={popular} viewAllHref="/products" locale={locale} />

      <BuyAgainRail />

      {originRails.map(rail => (
        <ProductRail
          key={rail.originRegion}
          title={`${t('home.fromOrigin', locale)} ${rail.originRegion}`}
          products={rail.products}
          locale={locale}
        />
      ))}

    </div>
  )
}
