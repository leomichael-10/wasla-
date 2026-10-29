'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import MediaThumb from '../../components/MediaThumb'
import { useLocale } from '../../lib/LocaleContext'
import { t, placeName } from '../../lib/i18n'

function RestaurantCard({ restaurant, locale }) {
  const location = [restaurant.area, restaurant.city].filter(Boolean).map(p => placeName(p, locale))
  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className="group bg-white rounded-3xl border border-brand-50 shadow-sm hover:shadow-lg hover:border-brand-200 transition-all duration-300 flex flex-col overflow-hidden"
    >
      <MediaThumb src={restaurant.image} alt={restaurant.businessName} className="aspect-[2/1]" />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 dir="auto" className="font-black text-gray-900 text-base truncate group-hover:underline"><bdi>{restaurant.businessName}</bdi></h3>
          {!restaurant.isOpen && (
            <span className="shrink-0 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {locale === 'ar' ? 'مغلق' : 'Closed'}
            </span>
          )}
        </div>
        {location.length > 0 && (
          <p dir="auto" className="text-xs text-gray-400 truncate">{location.join(locale === 'ar' ? '، ' : ', ')}</p>
        )}
        <p className="text-xs text-gray-400 mt-auto">
          {restaurant.dishCount} {locale === 'ar' ? 'طبق' : restaurant.dishCount === 1 ? 'dish' : 'dishes'}
        </p>
      </div>
    </Link>
  )
}

export default function RestaurantsPage() {
  const { locale } = useLocale()
  const [restaurants, setRestaurants] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [failed,      setFailed]      = useState(false)

  useEffect(() => {
    fetch('/api/restaurants')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setRestaurants(data.restaurants ?? [])
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />

      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/" className="hover:text-brand-600 transition-colors">{t('shops.home', locale)}</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">{t('restaurants.pageTitle', locale)}</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{t('restaurants.pageTitle', locale)}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-brand-50 animate-pulse overflow-hidden">
                <div className="aspect-[2/1] bg-brand-50" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-brand-50 rounded w-1/2" />
                  <div className="h-3 bg-brand-50 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : failed || restaurants.length === 0 ? (
          <div className="bg-white rounded-3xl border border-brand-50 shadow-sm py-20 text-center">
            <p className="text-gray-500 font-semibold text-lg">{t('restaurants.empty', locale)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
