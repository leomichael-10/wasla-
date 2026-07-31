'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '../../components/Navbar'
import BrowseProductTile from '../../components/BrowseProductTile'
import CategoryIcon from '../../components/CategoryIcon'
import { getZoneCookie } from '../../lib/zone'
import { getLocaleCookie, t, categoryName } from '../../lib/i18n'

const BRANDS = ['Kassala', 'Gedaref', 'El Obeid']
const CITIES = ['Cairo', 'Giza', '6th of October', 'Alexandria']

const SORT_KEYS = [
  { value: 'az',         key: 'browse.sortAz'        },
  { value: 'popular',    key: 'browse.sortPopular'   },
  { value: 'price_asc',  key: 'browse.sortPriceAsc'  },
  { value: 'price_desc', key: 'browse.sortPriceDesc' },
]

function AllIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.25A1.25 1.25 0 0 1 5.25 4h4A1.25 1.25 0 0 1 10.5 5.25v4A1.25 1.25 0 0 1 9.25 10.5h-4A1.25 1.25 0 0 1 4 9.25v-4ZM13.5 5.25A1.25 1.25 0 0 1 14.75 4h4A1.25 1.25 0 0 1 20 5.25v4A1.25 1.25 0 0 1 18.75 10.5h-4A1.25 1.25 0 0 1 13.5 9.25v-4ZM4 14.75A1.25 1.25 0 0 1 5.25 13.5h4A1.25 1.25 0 0 1 10.5 14.75v4A1.25 1.25 0 0 1 9.25 20h-4A1.25 1.25 0 0 1 4 18.75v-4ZM13.5 14.75A1.25 1.25 0 0 1 14.75 13.5h4A1.25 1.25 0 0 1 20 14.75v4A1.25 1.25 0 0 1 18.75 20h-4A1.25 1.25 0 0 1 13.5 18.75v-4Z" />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-brand-50 animate-pulse overflow-hidden">
      <div className="aspect-square bg-brand-50" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-brand-50 rounded w-1/3" />
        <div className="h-4 bg-brand-50 rounded w-3/4" />
        <div className="h-2.5 bg-brand-50 rounded w-1/2" />
      </div>
    </div>
  )
}

// Upright icon-tile category rail. First in DOM so it naturally sits at the
// inline-start edge of the flex row — right in RTL, left in LTR — with no
// hardcoded left/right, since flexbox's main axis follows the ambient
// `dir` rather than a fixed physical side.
function CategoryRail({ categories, active, onSelect, locale }) {
  const items = [{ id: '__all__', name: null }, ...categories]

  return (
    <div className="w-20 sm:w-24 shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto flex flex-col gap-2 pe-0.5">
      {items.map(cat => {
        const isAll    = cat.id === '__all__'
        const isActive = isAll ? !active : active === cat.name
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(isAll ? '' : cat.name)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1.5 transition-all duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              isActive
                ? 'bg-accent-400 text-white shadow-md'
                : 'bg-white text-brand-600 border border-brand-50 shadow-sm hover:bg-brand-50'
            }`}
          >
            {isAll ? (
              <AllIcon className="w-6 h-6 shrink-0" />
            ) : (
              <CategoryIcon name={cat.name} className="w-6 h-6 shrink-0" />
            )}
            <span className="text-[10px] font-bold leading-tight text-center">
              {isAll ? t('browse.all', locale) : categoryName(cat.name, locale)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FilterPanel({ brand, setBrand, city, setCity, locale, onClose }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-brand-400 uppercase tracking-wide mb-3">{t('browse.brand', locale)}</p>
        <div className="space-y-2.5">
          {BRANDS.map(b => (
            <label key={b} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="brand" checked={brand === b} onChange={() => setBrand(brand === b ? '' : b)} className="accent-accent-500 w-4 h-4" />
              <span className="text-sm text-gray-700 group-hover:text-brand-600 transition-colors">{b}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-brand-400 uppercase tracking-wide mb-3">{t('browse.city', locale)}</p>
        <div className="space-y-2.5">
          {CITIES.map(c => (
            <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="city" checked={city === c} onChange={() => setCity(city === c ? '' : c)} className="accent-accent-500 w-4 h-4" />
              <span className="text-sm text-gray-700 group-hover:text-brand-600 transition-colors">{c}</span>
            </label>
          ))}
        </div>
      </div>

      {onClose && (
        <button onClick={onClose} className="w-full bg-brand-700 hover:bg-brand-800 active:scale-95 text-white font-bold py-2.5 rounded-2xl text-sm transition-all duration-200">
          {t('browse.showResults', locale)}
        </button>
      )}
    </div>
  )
}

function ProductsBrowser() {
  const searchParams = useSearchParams()

  const [products,    setProducts]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [locale,      setLocale]      = useState('ar')

  const [search,   setSearch]   = useState(searchParams.get('search')   ?? '')
  const [brand,    setBrand]    = useState(searchParams.get('brand')    ?? '')
  const [category, setCategory] = useState(searchParams.get('category') ?? '')
  const [city,     setCity]     = useState(searchParams.get('city')     ?? '')
  const [sort,     setSort]     = useState(searchParams.get('sort')     ?? 'az')

  const hasFilters = search || brand || category || city
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
      .catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)   params.set('search',   search)
    if (brand)    params.set('brand',    brand)
    if (category) params.set('category', category)
    if (city)     params.set('city',     city)
    params.set('sort', sort)
    const zone = getZoneCookie()
    if (zone) params.set('zoneId', zone.id)

    try {
      const res  = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [search, brand, category, city, sort])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  function clearFilters() { setSearch(''); setBrand(''); setCategory(''); setCity('') }

  return (
    <div className="min-h-screen bg-[#FBF6EF]" dir={dir}>
      <Navbar />

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl p-6 shadow-2xl transition-transform duration-300 sm:hidden ${mobileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-gray-900">{t('browse.filters', locale)}</h2>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close filters">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-semibold mb-4 block">{t('browse.clearAll', locale)}</button>
        )}
        <FilterPanel brand={brand} setBrand={setBrand} city={city} setCity={setCity} locale={locale} onClose={() => setMobileOpen(false)} />
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{t('browse.title', locale)}</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {products.length} {t('browse.products', locale)}
                {category && <span> {t('browse.inCategory', locale)} <span className="font-semibold text-accent-600">{categoryName(category, locale)}</span></span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="border border-brand-100 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-300 bg-white text-brand-800 font-semibold"
            >
              {SORT_KEYS.map(o => (
                <option key={o.value} value={o.value}>{t(o.key, locale)}</option>
              ))}
            </select>

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('browse.search', locale)}
                className="border border-brand-100 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-300 bg-white w-32 sm:w-40"
              />
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className="sm:hidden flex items-center gap-1.5 bg-white border border-brand-100 rounded-full px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm min-h-11 active:scale-95 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              {t('browse.filters', locale)}
              {hasFilters && (
                <span className="bg-accent-400 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">·</span>
              )}
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              search   && { label: `"${search}"`,              clear: () => setSearch('') },
              brand    && { label: brand,                       clear: () => setBrand('') },
              category && { label: categoryName(category, locale), clear: () => setCategory('') },
              city     && { label: city,                        clear: () => setCity('') },
            ].filter(Boolean).map(chip => (
              <button key={chip.label} onClick={chip.clear}
                className="flex items-center gap-1.5 bg-accent-50 text-accent-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-accent-100 active:scale-95 transition-all duration-200">
                {chip.label}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-accent-500">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            ))}
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 font-semibold px-2 transition-colors">{t('browse.clearAll', locale)}</button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex gap-4 sm:gap-6 items-start pt-2">

          {categories.length > 0 && (
            <CategoryRail categories={categories} active={category} onSelect={setCategory} locale={locale} />
          )}

          <aside className="hidden sm:block w-52 shrink-0">
            <div className="bg-white rounded-3xl border border-brand-50 shadow-sm p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-gray-900 text-sm">{t('browse.filters', locale)}</h2>
                {hasFilters && <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600 font-semibold">{t('browse.clear', locale)}</button>}
              </div>
              <FilterPanel brand={brand} setBrand={setBrand} city={city} setCity={setCity} locale={locale} />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24">
                <span className="inline-flex text-accent-300 mb-3">
                  {category ? <CategoryIcon name={category} className="w-12 h-12" /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="w-12 h-12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8c3-2 6 0 5 3-.7 2-3 2.5-4.5 1.5C8 11.3 7.5 9.3 9 8ZM4 20l6-6M14 14l6 6M4 4l16 16" />
                    </svg>
                  )}
                </span>
                <p className="text-brand-800 font-bold text-lg">
                  {category ? t('browse.emptyCategoryTitle', locale) : t('browse.emptyTitle', locale)}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {category ? t('browse.emptyCategorySubtitle', locale) : t('browse.emptySubtitle', locale)}
                </p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-4 text-accent-500 font-bold hover:underline text-sm">{t('browse.clearAll', locale)}</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                  <BrowseProductTile key={product.id} product={product} locale={locale} />
                ))}
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBF6EF]">
        <div className="h-16 bg-brand-700" />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-10">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    }>
      <ProductsBrowser />
    </Suspense>
  )
}
