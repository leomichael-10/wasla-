'use client'
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import ProductCard from '../../../components/ProductCard'
import MediaThumb from '../../../components/MediaThumb'
import { getLocaleCookie, t, categoryName, countReviews } from '../../../lib/i18n'

function StarDisplay({ rating, count, locale }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`text-sm ${i < Math.round(rating) ? 'text-yellow-400' : 'text-brand-200'}`}>&#9733;</span>
        ))}
      </div>
      <span className="text-sm font-bold text-brand-700">{rating.toFixed(1)}</span>
      <span className="text-xs text-brand-300">({countReviews(count, locale)})</span>
    </div>
  )
}

export default function ShopPage() {
  const { id } = useParams()
  const [shop,       setShop]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState('All')
  const [locale,     setLocale]     = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    fetch(`/api/shops/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setShop(data.shop)
        if (data.shop?.trackingPixel?.id) {
          fetch(`/api/track/pixel/${data.shop.trackingPixel.id}`).catch(() => {})
        }
      })
      .catch(err => setError(err.message || t('shop.loadFailed', locale)))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive unique category tabs from products
  const categories = useMemo(() => {
    if (!shop?.products?.length) return []
    const seen = new Set()
    const cats = []
    for (const p of shop.products) {
      const name = p.category?.name
      if (name && !seen.has(name)) { seen.add(name); cats.push(name) }
    }
    return cats.sort()
  }, [shop])

  const filteredProducts = useMemo(() => {
    if (!shop?.products) return []
    if (activeTab === 'All') return shop.products
    return shop.products.filter(p => p.category?.name === activeTab)
  }, [shop, activeTab])

  if (loading) return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-48 bg-white rounded-2xl border border-brand-100" />
        <div className="h-10 bg-white rounded-2xl border border-brand-100 w-1/2" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-white rounded-2xl border border-brand-100" />
          ))}
        </div>
      </div>
    </div>
  )

  if (error || !shop) return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <p className="text-brand-400 font-semibold">{error || t('shop.notFound', locale)}</p>
        <Link href="/shops" className="mt-4 inline-block text-brand-700 font-bold hover:underline text-sm">
          {t('shop.browseShops', locale)}
        </Link>
      </div>
    </div>
  )

  const jsonLd = {
    '@context':  'https://schema.org',
    '@type':     'GroceryStore',
    name:        shop.businessName,
    address:     shop.city ? { '@type': 'PostalAddress', addressLocality: shop.city, addressRegion: shop.area ?? undefined, addressCountry: 'EG' } : undefined,
    aggregateRating: shop.reviewCount > 0 ? {
      '@type':      'AggregateRating',
      ratingValue:  shop.averageRating,
      reviewCount:  shop.reviewCount,
    } : undefined,
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />

      {/* ── Shop hero banner ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500">
        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-brand-100 text-xs mb-5">
            <Link href="/" className="hover:text-white transition-colors">{t('shop.home', locale)}</Link>
            <span>/</span>
            <Link href="/shops" className="hover:text-white transition-colors">{t('shops.shopsHeading', locale)}</Link>
            <span>/</span>
            <span className="text-white font-medium">{shop.businessName}</span>
          </div>

          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <MediaThumb src={shop.logoUrl} alt={shop.businessName} className="w-20 h-20 rounded-2xl shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-white">{shop.businessName}</h1>
                {shop.approvedByAdmin && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                    {t('shop.verifiedSeller', locale)}
                  </span>
                )}
              </div>

              {(shop.city || shop.area) && (
                <p className="text-brand-100 text-sm mb-2">
                  {[shop.city, shop.area].filter(Boolean).join(', ')}
                </p>
              )}

              {shop.reviewCount > 0 && (
                <div className="mb-3">
                  <StarDisplay rating={shop.averageRating} count={shop.reviewCount} locale={locale} />
                </div>
              )}

              {/* Quick badges */}
              <div className="flex flex-wrap gap-2">
                {shop.deliveryAvailable && (
                  <span className="bg-nile-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t('shop.deliveryAvailable', locale)}
                  </span>
                )}
                {shop.warrantyAvailable && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t('shop.warranty', locale)}
                  </span>
                )}
                {shop.workingHours && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {shop.workingHours}
                  </span>
                )}
                {shop.workingDays && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {shop.workingDays}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-5 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{shop.productCount}</p>
                <p className="text-xs text-brand-100 font-semibold uppercase tracking-wide mt-0.5">{t('shops.productsHeading', locale)}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{shop.orderCount}</p>
                <p className="text-xs text-brand-100 font-semibold uppercase tracking-wide mt-0.5">{t('shops.ordersHeading', locale)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Category tabs ──────────────────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm px-4 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {['All', ...categories].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    activeTab === tab
                      ? 'bg-brand-700 text-white'
                      : 'text-brand-400 hover:text-brand-900 hover:bg-sand-50'
                  }`}
                >
                  {tab === 'All' ? t('shop.allTab', locale) : categoryName(tab, locale)}
                  {tab === 'All' ? (
                    <span className="ms-1.5 text-xs opacity-70">({shop.productCount})</span>
                  ) : (
                    <span className="ms-1.5 text-xs opacity-70">
                      ({shop.products.filter(p => p.category?.name === tab).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Products grid ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-black text-brand-900 mb-4">
            {activeTab === 'All' ? t('shop.allProducts', locale) : categoryName(activeTab, locale)}
            <span className="ms-2 text-base font-normal text-brand-300">({filteredProducts.length})</span>
          </h2>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm py-16 text-center">
              <p className="text-brand-300 font-medium">{t('shop.noProductsInCategory', locale)}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* ── Reviews ────────────────────────────────────────────────────── */}
        {shop.reviews?.length > 0 && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-black text-brand-900 text-base">
                  {t('shop.reviews', locale)}
                  <span className="ms-2 text-brand-300 font-normal text-sm">({shop.reviewCount})</span>
                </h2>
                {shop.reviewCount > 0 && (
                  <div className="mt-1">
                    <StarDisplay rating={shop.averageRating} count={shop.reviewCount} locale={locale} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {shop.reviews.map(review => (
                <div key={review.id} className="flex gap-3 border-b border-brand-50 last:border-0 pb-4 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-black text-sm shrink-0">
                    {(review.customer?.customerProfile?.fullName ?? t('shop.customer', locale))[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-brand-800">
                        {review.customer?.customerProfile?.fullName ?? t('shop.customer', locale)}
                      </span>
                      <span className="text-xs text-brand-300">
                        {new Date(review.createdAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex gap-0.5 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-brand-200'}`}>&#9733;</span>
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-brand-600 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
