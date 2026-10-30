import { cookies } from 'next/headers'
import { prisma } from '../lib/prisma'
import Navbar from '../components/Navbar'
import ZoneBar from '../components/ZoneBar'
import HomeHeader from '../components/home/HomeHeader'
import HomeSearchBar from '../components/home/HomeSearchBar'
import HeroBanner from '../components/home/HeroBanner'
import ModeCards from '../components/home/ModeCards'
import BestSellerRail from '../components/home/BestSellerRail'
import PlaceholderTiles from '../components/home/PlaceholderTiles'
import { DEFAULT_LOCALE, LOCALE_COOKIE } from '../lib/i18n'
import { CATALOGUE_WHERE, CATALOGUE_INCLUDE, toCatalogueProducts } from '../lib/catalogue'

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

// Rails read the shared catalogue definition (lib/catalogue.js) — the same
// one /products and /shops/[id] use — so a product shown on the home page is
// always one the browse page will also show.
async function getPopularProducts(zoneId) {
  try {
    const raw = await prisma.product.findMany({
      where:   CATALOGUE_WHERE,
      orderBy: { createdAt: 'desc' },
      take:    10,
      include: CATALOGUE_INCLUDE,
    })
    return JSON.parse(JSON.stringify(await annotateWithZone(toCatalogueProducts(raw), zoneId)))
  } catch { return [] }
}

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
