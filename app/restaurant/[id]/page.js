'use client'
import { useState, useEffect, useLayoutEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { addToCart } from '../../../lib/cart'
import { getLocaleCookie, t } from '../../../lib/i18n'

function DishCard({ dish, locale }) {
  const [feedback, setFeedback] = useState(false)
  const [userId,   setUserId]   = useState('guest')

  const prices     = dish.variants.map(v => Number(v.price))
  const minPrice   = Math.min(...prices)
  const maxPrice   = Math.max(...prices)
  const priceLabel = minPrice === maxPrice
    ? `EGP ${minPrice.toFixed(0)}`
    : `EGP ${minPrice.toFixed(0)}–${maxPrice.toFixed(0)}`

  const shopClosed      = dish.seller?.isOpen === false
  const inStockVariant  = shopClosed ? null : (dish.variants.find(v => v.inStock) ?? null)
  const mainImage       = dish.images?.[0] || dish.variants?.find(v => v.image)?.image || null

  useLayoutEffect(() => {
    try {
      const raw  = localStorage.getItem('wasla_user')
      const user = raw ? JSON.parse(raw) : null
      if (user?.id) setUserId(user.id)
    } catch { /* ignore */ }
  }, [])

  function handleAddToCart(e) {
    e.preventDefault()
    if (!inStockVariant) return
    addToCart({
      productVariantId: inStockVariant.id,
      productId:        dish.id,
      productName:      dish.name,
      brand:            dish.brand ?? '',
      label:            inStockVariant.label ?? '',
      price:            Number(inStockVariant.price),
      quantity:         1,
      sellerId:         dish.seller?.id ?? 0,
      sellerName:       dish.seller?.businessName ?? '',
    }, userId)
    setFeedback(true)
    setTimeout(() => setFeedback(false), 2000)
  }

  return (
    <div className={`relative bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-brand-50 hover:border-brand-200 overflow-hidden flex flex-col h-full ${shopClosed ? 'opacity-60 grayscale-35' : ''}`}>
      <div className="relative bg-linear-to-br from-brand-700 to-brand-500 pt-5 pb-8 px-4 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full bg-white border-4 border-white/80 overflow-hidden flex items-center justify-center shadow-lg">
          {mainImage ? (
            <img src={mainImage} alt={dish.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-brand-200 select-none tracking-tighter">
              {dish.name[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="absolute bottom-0 translate-y-1/2 rtl:left-4 ltr:right-4 bg-accent-400 text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg z-10">
          {priceLabel}
        </div>
      </div>

      <div className="pt-6 px-4 pb-4 flex flex-col flex-1 gap-1.5">
        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-10">{dish.name}</h3>
        {dish.description && (
          <p className="text-xs text-gray-400 leading-tight line-clamp-2">{dish.description}</p>
        )}

        <div className="mt-auto pt-2">
          <button
            className={`w-full text-white text-xs font-bold py-2.5 rounded-2xl active:scale-95 transition-all duration-200 ${
              feedback
                ? 'bg-green-500 scale-95'
                : inStockVariant
                  ? 'bg-brand-700 hover:bg-brand-800'
                  : 'bg-gray-300 cursor-not-allowed'
            }`}
            onClick={handleAddToCart}
            disabled={!inStockVariant}
          >
            {feedback
              ? t('browse.addToCart', locale) + ' ✓'
              : inStockVariant
                ? t('browse.addToCart', locale)
                : shopClosed ? t('browse.outOfZone', locale) : t('browse.outOfStock', locale)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RestaurantPage() {
  const { id } = useParams()
  const [locale,     setLocale]     = useState('ar')
  const [restaurant, setRestaurant] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  useEffect(() => {
    setLocale(getLocaleCookie())
  }, [])

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setRestaurant(data.restaurant)
      })
      .catch(err => setError(err.message || t('restaurant.notFound', locale)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-48 bg-white rounded-2xl border border-gray-100" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-white rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    </div>
  )

  if (error || !restaurant) return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500 font-semibold">{error || t('restaurant.notFound', locale)}</p>
        <Link href="/" className="mt-4 inline-block text-brand-700 font-bold hover:underline text-sm">
          {t('tab.home', locale)}
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />

      {/* Restaurant hero banner */}
      <div className="bg-linear-to-br from-brand-800 via-brand-600 to-brand-500">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-1.5 text-brand-100 text-xs mb-5">
            <Link href="/" className="hover:text-white transition-colors">{t('tab.home', locale)}</Link>
            <span>/</span>
            <span className="text-white font-medium">{t('restaurant.breadcrumb', locale)}</span>
            <span>/</span>
            <span className="text-white font-medium">{restaurant.businessName}</span>
          </div>

          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-3xl font-black text-white select-none">
                {restaurant.businessName[0].toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white mb-1">{restaurant.businessName}</h1>

              {/* English falls back to Arabic when descriptionEn is empty —
                  never render an empty tagline either way. */}
              {(locale === 'en' ? (restaurant.descriptionEn || restaurant.descriptionAr) : restaurant.descriptionAr) && (
                <p className="text-brand-100 text-sm mb-1">
                  {locale === 'en' ? (restaurant.descriptionEn || restaurant.descriptionAr) : restaurant.descriptionAr}
                </p>
              )}

              {(restaurant.city || restaurant.area) && (
                <p className="text-brand-100 text-sm mb-2">
                  {[restaurant.area, restaurant.city].filter(Boolean).join(', ')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {restaurant.deliveryAvailable && (
                  <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t('home.sameDay', locale)}
                  </span>
                )}
                {restaurant.workingHours && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {restaurant.workingHours}
                  </span>
                )}
                {restaurant.workingDays && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {restaurant.workingDays}
                  </span>
                )}
              </div>
            </div>

            <div className="text-center shrink-0">
              <p className="text-2xl font-black text-white">{restaurant.dishCount}</p>
              <p className="text-xs text-brand-100 font-semibold uppercase tracking-wide mt-0.5">
                {t('restaurant.dishes', locale)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4">{t('restaurant.menu', locale)}</h2>

          {restaurant.dishes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-24 text-center">
              <p className="text-4xl mb-4">🍽️</p>
              <h3 className="text-xl font-black text-gray-900 mb-2">{t('restaurant.menuComingSoon', locale)}</h3>
              <p className="text-sm text-gray-500">{t('restaurant.menuComingSoonHint', locale)}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {restaurant.menuSections.map(({ section, dishes }) => (
                <div key={section ?? '__other__'}>
                  <h3 className="text-base font-black text-brand-700 mb-3">
                    {section ?? t('restaurant.otherSection', locale)}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {dishes.map(dish => (
                      <DishCard key={dish.id} dish={dish} locale={locale} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
