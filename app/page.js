'use client'
import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import ZoneBar from '../components/ZoneBar'
import HomeHeader from '../components/home/HomeHeader'
import HomeSearchBar from '../components/home/HomeSearchBar'
import HeroBanner from '../components/home/HeroBanner'
import ModeCards from '../components/home/ModeCards'
import BestSellerRail from '../components/home/BestSellerRail'
import PlaceholderTiles from '../components/home/PlaceholderTiles'
import { useLocale } from '../lib/LocaleContext'
import { getZoneCookie } from '../lib/zone'
import { apiUrl } from '../lib/apiBase'

export default function HomePage() {
  const { locale } = useLocale()
  const [popular, setPopular] = useState([])

  // Rails read the shared catalogue definition (lib/catalogue.js, via
  // /api/products) — the same one /products and /shops/[id] use — so a
  // product shown on the home page is always one the browse page will also
  // show. zoneId is a hard filter server-side (see /api/products), not a
  // client-side sort, so this rail only ever shows products that actually
  // deliver to the visitor's zone.
  const fetchPopular = useCallback(() => {
    const zoneId = getZoneCookie()?.id
    const params  = new URLSearchParams({ sort: 'newest', limit: '10' })
    if (zoneId) params.set('zoneId', zoneId)
    fetch(apiUrl(`/api/products?${params}`))
      .then(r => r.ok ? r.json() : { products: [] })
      .then(data => setPopular(data.products ?? []))
      .catch(() => setPopular([]))
  }, [])

  useEffect(() => { fetchPopular() }, [fetchPopular])

  useEffect(() => {
    window.addEventListener('zoneUpdated', fetchPopular)
    return () => window.removeEventListener('zoneUpdated', fetchPopular)
  }, [fetchPopular])

  return (
    <div className="bg-sand-50 pb-20">
      <div className="hidden lg:block">
        <Navbar />
        <ZoneBar />
      </div>
      <div className="lg:max-w-xl lg:mx-auto">
        <HomeHeader locale={locale} />
        <HomeSearchBar locale={locale} />
        <HeroBanner locale={locale} />
        <ModeCards locale={locale} />
        <BestSellerRail products={popular} locale={locale} />
        <PlaceholderTiles locale={locale} />
      </div>
    </div>
  )
}
