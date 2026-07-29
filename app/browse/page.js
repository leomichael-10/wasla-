'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { getZoneCookie } from '../../lib/zone'

const SORT_OPTIONS = [
  { value: 'az',         label: 'A to Z'            },
  { value: 'popular',    label: 'Most Popular'       },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

const BRANDS = ['Kassala', 'Gedaref', 'El Obeid']
const CITIES = ['Cairo', 'Giza', '6th of October', 'Alexandria']

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
}

function BrowseProductCard({ product }) {
  const prices    = product.variants.map(v => Number(v.price))
  const minPrice  = Math.min(...prices)
  const maxPrice  = Math.max(...prices)
  const priceLabel = minPrice === maxPrice ? `EGP ${minPrice.toFixed(0)}` : `EGP ${minPrice.toFixed(0)}–${maxPrice.toFixed(0)}`
  const labels     = product.variants.map(v => v.label).filter(Boolean)

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full"
    >
      <div className="bg-linear-to-br from-purple-50 via-purple-100 to-violet-100 aspect-square flex items-center justify-center">
        <span className="text-4xl font-black text-purple-200 select-none tracking-tighter">
          {(product.brand ?? 'V')[0].toUpperCase()}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {product.brand && (
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">{product.brand}</span>
        )}
        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{product.name}</h3>
        {labels.length > 0 && (
          <p className="text-xs text-gray-400">
            {labels.length} option{labels.length !== 1 ? 's' : ''}
            {' · '}{labels.slice(0, 2).join(', ')}{labels.length > 2 ? '…' : ''}
          </p>
        )}
        {product.seller?.city && (
          <p className="text-xs text-gray-400">{product.seller.city}</p>
        )}
        <p className="mt-auto pt-2 font-black text-gray-900 text-sm tabular-nums">{priceLabel}</p>
      </div>
    </Link>
  )
}

function BrowseBrowser() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [products,    setProducts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [backHref,    setBackHref]    = useState('/dashboard')
  const [search,      setSearch]      = useState(searchParams.get('search')   ?? '')
  const [brand,       setBrand]       = useState(searchParams.get('brand')    ?? '')
  const [category,    setCategory]    = useState(searchParams.get('category') ?? '')
  const [city,        setCity]        = useState(searchParams.get('city')     ?? '')
  const [sort,        setSort]        = useState(searchParams.get('sort')     ?? 'az')
  const [mobileOpen,  setMobileOpen]  = useState(false)

  // Determine back href from stored user role
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('wasla_user') ?? '{}')
      setBackHref(u.role === 'admin' ? '/admin' : '/dashboard')
    } catch { /* ignore */ }
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

  const hasFilters = search || brand || category || city
  function clearFilters() { setSearch(''); setBrand(''); setCategory(''); setCity('') }

  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />

      {/* Read-only banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between gap-4">
        <p className="text-sm text-yellow-700 font-semibold">
          You are viewing Wasla as a customer. Buying is disabled in this mode.
        </p>
        <Link
          href={backHref}
          className="shrink-0 text-sm font-bold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Mobile filter backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile filter sheet */}
      <div className={`fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl p-6 shadow-2xl transition-transform duration-300 sm:hidden ${mobileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-gray-900">Filters</h2>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <FilterPanel brand={brand} setBrand={setBrand} city={city} setCity={setCity} onClose={() => setMobileOpen(false)} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Browse Products</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-40"
              />
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="sm:hidden flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {/* Active chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              search   && { label: `"${search}"`, clear: () => setSearch('') },
              brand    && { label: brand,          clear: () => setBrand('') },
              category && { label: category,       clear: () => setCategory('') },
              city     && { label: city,           clear: () => setCity('') },
            ].filter(Boolean).map(chip => (
              <button key={chip.label} onClick={chip.clear}
                className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors">
                {chip.label}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-purple-600">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            ))}
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 font-semibold px-2 transition-colors">Clear all</button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden sm:block w-52 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-gray-900 text-sm">Filters</h2>
                {hasFilters && <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600 font-semibold">Clear</button>}
              </div>
              <FilterPanel brand={brand} setBrand={setBrand} city={city} setCity={setCity} />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-gray-500 font-semibold text-lg">No products found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-4 text-purple-700 font-bold hover:underline text-sm">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                  <BrowseProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function FilterPanel({ brand, setBrand, city, setCity, onClose }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Brand</p>
        <div className="space-y-1.5">
          {BRANDS.map(b => (
            <label key={b} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="browse-brand" checked={brand === b} onChange={() => setBrand(brand === b ? '' : b)} className="accent-purple-600 w-4 h-4" />
              <span className="text-sm text-gray-700 group-hover:text-purple-700 transition-colors">{b}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">City</p>
        <div className="space-y-1.5">
          {CITIES.map(c => (
            <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="browse-city" checked={city === c} onChange={() => setCity(city === c ? '' : c)} className="accent-purple-600 w-4 h-4" />
              <span className="text-sm text-gray-700 group-hover:text-purple-700 transition-colors">{c}</span>
            </label>
          ))}
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          Show results
        </button>
      )}
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9f7ff]">
        <div className="h-16 bg-purple-700" />
        <div className="h-10 bg-yellow-50 border-b border-yellow-200" />
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    }>
      <BrowseBrowser />
    </Suspense>
  )
}
