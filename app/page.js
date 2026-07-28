import Link from 'next/link'
import { cookies } from 'next/headers'
import { prisma } from '../lib/prisma'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'
import { DEFAULT_LOCALE, LOCALE_COOKIE, t } from '../lib/i18n'

async function getShops() {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where:   { approvedByAdmin: true },
      orderBy: { businessName: 'asc' },
      take:    12,
      include: {
        reviews:  { select: { rating: true } },
        products: { where: { isActive: true }, select: { id: true } },
      },
    })
    return sellers.map(s => {
      const avg = s.reviews.length
        ? s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length
        : 0
      return {
        id:                s.id,
        businessName:      s.businessName,
        city:              s.city,
        area:              s.area,
        workingHours:      s.workingHours,
        workingDays:       s.workingDays,
        deliveryAvailable: s.deliveryAvailable,
        warrantyAvailable: s.warrantyAvailable,
        productCount:      s.products.length,
        reviewCount:       s.reviews.length,
        averageRating:     Math.round(avg * 10) / 10,
      }
    })
  } catch { return [] }
}

async function getCategories() {
  try {
    const cats = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    })
    return JSON.parse(JSON.stringify(cats))
  } catch { return [] }
}

async function getFeaturedProducts() {
  try {
    const raw = await prisma.product.findMany({
      where:   { isActive: true },
      orderBy: { createdAt: 'desc' },
      take:    8,
      include: {
        variants: {
          select: { id: true, label: true, price: true, stockQty: true },
          orderBy: { label: 'asc' },
        },
        seller:   { select: { id: true, businessName: true, city: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return JSON.parse(JSON.stringify(raw))
  } catch { return [] }
}

function ShopCard({ shop }) {
  return (
    <Link
      href={`/shops/${shop.id}`}
      className="group bg-white rounded-3xl border border-purple-50 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 flex flex-col overflow-hidden"
    >
      <div className="h-24 bg-linear-to-br from-purple-700 to-violet-600 flex items-center justify-center relative">
        <span className="text-5xl font-black text-white/20 select-none group-hover:text-white/35 transition-colors">
          {shop.businessName[0].toUpperCase()}
        </span>
        {shop.deliveryAvailable && (
          <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Delivery
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-black text-gray-900 text-base leading-snug group-hover:text-purple-700 transition-colors">
          {shop.businessName}
        </h3>

        {(shop.city || shop.area) && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0 text-purple-400">
              <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM2.5 6a5.5 5.5 0 1 1 9.5 3.774l2.614 2.613a.75.75 0 0 1-1.06 1.06L11 11.061A5.5 5.5 0 0 1 2.5 6Z" clipRule="evenodd" />
            </svg>
            {[shop.city, shop.area].filter(Boolean).join(', ')}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1">
            {shop.averageRating > 0 ? (
              <>
                <span className="text-amber-400 text-sm">&#9733;</span>
                <span className="text-xs font-bold text-gray-700">{shop.averageRating.toFixed(1)}</span>
                <span className="text-[10px] text-gray-400">({shop.reviewCount})</span>
              </>
            ) : (
              <span className="text-[11px] text-gray-400">No reviews yet</span>
            )}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">{shop.productCount} products</span>
        </div>

        {shop.workingHours && (
          <p className="text-[11px] text-gray-400">{shop.workingHours}</p>
        )}
      </div>
    </Link>
  )
}

const CATEGORY_ICONS = {
  'Disposables':        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>,
  'Devices':            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>,
  'Juices & E-Liquids': <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15m-1.8-3.5-3.75-3.75m0 0L10.5 11.5M19.8 15 21 16.5m0 0-1.5 1.5M21 18l-1.5-1.5" /></svg>,
  'Spareparts':         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" /></svg>,
  'Other':              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
}

function CategoryPill({ category }) {
  const icon = CATEGORY_ICONS[category.name] ?? CATEGORY_ICONS['Other']
  return (
    <Link
      href={`/products?category=${encodeURIComponent(category.name)}`}
      className="group shrink-0 flex flex-col items-center gap-2 w-20 h-20 sm:w-24 sm:h-24 py-4 px-2 bg-white rounded-2xl border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
    >
      <span className="text-purple-600 group-hover:text-purple-800 transition-colors">{icon}</span>
      <span className="text-xs font-bold text-gray-700 text-center leading-tight group-hover:text-purple-700 transition-colors">
        {category.name}
      </span>
      {category._count?.products > 0 && (
        <span className="text-[10px] text-gray-400">{category._count.products}</span>
      )}
    </Link>
  )
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE

  const [shops, categories, products] = await Promise.all([
    getShops(),
    getCategories(),
    getFeaturedProducts(),
  ])

  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />

      <section className="relative bg-linear-to-br from-purple-900 via-purple-700 to-violet-600 text-white overflow-hidden">
        <div className="absolute top-1/2 -translate-y-1/2 -left-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 right-0 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 sm:py-28 text-center">
          <div className="inline-block bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-wide uppercase">
            {t('home.tag', locale)}
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-4">
            {t('home.heading1', locale)}<br className="hidden sm:block" /> {t('home.heading2', locale)}
          </h1>
          <p className="text-purple-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            {t('home.subheading', locale)}
          </p>

          <form action="/products" method="GET" className="max-w-xl mx-auto">
            <div className="flex bg-white rounded-2xl shadow-2xl overflow-hidden p-1.5 gap-1">
              <input
                type="text"
                name="search"
                placeholder={t('home.searchPlaceholder', locale)}
                className="flex-1 pl-4 py-3 text-gray-800 text-sm focus:outline-none bg-transparent placeholder-gray-400"
              />
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-500 active:scale-95 active:bg-amber-600 text-gray-900 font-black px-6 py-3 rounded-xl text-sm transition-all duration-200 shrink-0"
              >
                {t('home.search', locale)}
              </button>
            </div>
          </form>

          <div className="flex justify-center gap-6 mt-10 flex-wrap">
            {[
              { label: `${shops.length}+ ${t('home.verifiedShops', locale)}` },
              { label: t('home.cod', locale) },
              { label: t('home.sameDay', locale) },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-purple-100 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-300 shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-10 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-900">Browse by Category</h2>
            <Link href="/products" className="text-purple-600 font-semibold text-sm hover:text-purple-800 transition-colors">
              View all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {categories.map(cat => (
              <CategoryPill key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Shops Near You</h2>
            <p className="text-sm text-gray-500 mt-0.5">{shops.length} verified shop{shops.length !== 1 ? 's' : ''} available</p>
          </div>
          <Link href="/shops" className="text-purple-600 font-semibold text-sm hover:text-purple-800 transition-colors">
            View all shops
          </Link>
        </div>

        {shops.length === 0 ? (
          <div className="bg-white rounded-3xl border border-purple-50 shadow-sm py-16 text-center">
            <p className="text-gray-500 font-semibold">No shops available in your area yet.</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon as new sellers join daily.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {shops.map(shop => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>

      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black text-gray-900">Popular Products</h2>
            <Link href="/products" className="text-purple-600 font-semibold text-sm hover:text-purple-800 transition-colors">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border-t border-purple-50 mt-4">
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step:  '1',
                title: 'Browse Shops',
                desc:  'Explore verified Sudanese shops in your area. See ratings, products, and delivery options.',
              },
              {
                step:  '2',
                title: 'Add to Cart',
                desc:  'Choose your products, select the options you need, then proceed to checkout.',
              },
              {
                step:  '3',
                title: 'Get Delivered',
                desc:  'Pay cash on delivery. Track your order status directly from your account.',
              },
            ].map(item => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-700 text-white font-black text-lg flex items-center justify-center shadow-md">
                  {item.step}
                </div>
                <h3 className="font-black text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
