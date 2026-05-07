'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '../../components/Navbar'
import ProductCard from '../../components/ProductCard'

const BRANDS = ['Elf Bar', 'Vozol', 'Lost Mary']
const EMIRATES = ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain']
const SORT_OPTIONS = [
  { value: 'az',         label: 'A to Z'            },
  { value: 'popular',    label: 'Most Popular'       },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-purple-50 animate-pulse overflow-hidden">
      <div className="aspect-square bg-purple-50" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-purple-50 rounded w-1/3" />
        <div className="h-4 bg-purple-50 rounded w-3/4" />
        <div className="h-2.5 bg-purple-50 rounded w-1/2" />
        <div className="h-7 bg-purple-50 rounded-full mt-3 w-full" />
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
              <input type="radio" name="brand" checked={brand === b} onChange={() => setBrand(brand === b ? '' : b)} className="accent-purple-600 w-4 h-4" />
              <span className="text-sm text-gray-700 group-hover:text-purple-600 transition-colors">{b}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Emirate</p>
        <div className="space-y-1.5">
          {EMIRATES.map(c => (
            <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="city" checked={city === c} onChange={() => setCity(city === c ? '' : c)} className="accent-purple-600 w-4 h-4" />
              <span className="text-sm text-gray-700 group-hover:text-purple-600 transition-colors">{c}</span>
            </label>
          ))}
        </div>
      </div>

      {onClose && (
        <button onClick={onClose} className="w-full bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold py-2.5 rounded-2xl text-sm transition-all duration-200">
          Show results
        </button>
      )}
    </div>
  )
}

function CategoryRail({ categories, active, onSelect }) {
  const ALL = { id: '__all__', name: 'All' }
  const items = [ALL, ...categories]

  return (
    <div
      className="sm:hidden flex flex-col bg-white border-r border-purple-100 overflow-y-auto"
      style={{ position: 'fixed', left: 0, top: 64, bottom: 0, width: 56, zIndex: 30 }}
    >
      {items.map(cat => {
        const isActive = cat.id === '__all__' ? !active : active === cat.name
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id === '__all__' ? '' : cat.name)}
            className={`relative flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-purple-700 text-white'
                : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'
            }`}
            style={{ minHeight: 56 }}
          >
            {isActive && (
              <span className="absolute right-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-full" />
            )}
            <span
              className="text-[11px] font-bold leading-none select-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {cat.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ProductsBrowser() {
  const searchParams = useSearchParams()

  const [products,    setProducts]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  const [search,   setSearch]   = useState(searchParams.get('search')   ?? '')
  const [brand,    setBrand]    = useState(searchParams.get('brand')    ?? '')
  const [category, setCategory] = useState(searchParams.get('category') ?? '')
  const [city,     setCity]     = useState(searchParams.get('city')     ?? '')
  const [sort,     setSort]     = useState(searchParams.get('sort')     ?? 'az')

  const hasFilters = search || brand || category || city

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
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl p-6 shadow-2xl transition-transform duration-300 sm:hidden ${mobileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-gray-900">Filters</h2>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close filters">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-semibold mb-4 block">Clear all filters</button>
        )}
        <FilterPanel brand={brand} setBrand={setBrand} city={city} setCity={setCity} onClose={() => setMobileOpen(false)} />
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-3 sm:pl-4 pl-18">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Browse Products</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {products.length} product{products.length !== 1 ? 's' : ''}
                {category && <span> in <span className="font-semibold text-purple-600">{category}</span></span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              onClick={() => setMobileOpen(true)}
              className="sm:hidden flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm min-h-11 active:scale-95 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              Filters
              {hasFilters && (
                <span className="bg-purple-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">·</span>
              )}
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              search   && { label: `"${search}"`, clear: () => setSearch('') },
              brand    && { label: brand,          clear: () => setBrand('') },
              category && { label: category,       clear: () => setCategory('') },
              city     && { label: city,           clear: () => setCity('') },
            ].filter(Boolean).map(chip => (
              <button key={chip.label} onClick={chip.clear}
                className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-purple-100 active:scale-95 transition-all duration-200">
                {chip.label}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-purple-400">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            ))}
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 font-semibold px-2 transition-colors">Clear all</button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto" style={{ minHeight: 'calc(100vh - 160px)' }}>

        {categories.length > 0 && (
          <CategoryRail
            categories={categories}
            active={category}
            onSelect={setCategory}
          />
        )}

        <div className="sm:pl-0 pl-14 px-4 pb-10">
          <div className="flex gap-6 pt-2">

            <aside className="hidden sm:block w-52 shrink-0">
              <div className="bg-white rounded-2xl border border-purple-50 shadow-sm p-5 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-gray-900 text-sm">Filters</h2>
                  {hasFilters && <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600 font-semibold">Clear</button>}
                </div>

                {categories.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => setCategory('')}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                          !category ? 'bg-purple-700 text-white' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        All
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(category === cat.name ? '' : cat.name)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                            category === cat.name ? 'bg-purple-700 text-white' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                    <button onClick={clearFilters} className="mt-4 text-purple-600 font-bold hover:underline text-sm">Clear filters</button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </main>

          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9f7ff]">
        <div className="h-16 bg-purple-700" />
        <div className="max-w-7xl mx-auto px-4 py-6 pl-18 sm:pl-4">
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
