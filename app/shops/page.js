'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

const EMIRATES = ['All Emirates', 'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain']

function Stars({ rating }) {
  const rounded = Math.round(rating)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs ${i < rounded ? 'text-amber-400' : 'text-gray-200'}`}>&#9733;</span>
      ))}
    </div>
  )
}

function ShopCard({ shop }) {
  return (
    <Link
      href={`/shops/${shop.id}`}
      className="group bg-white rounded-3xl border border-purple-50 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 flex flex-col overflow-hidden"
    >
      <div className="h-20 bg-linear-to-br from-purple-700 to-violet-600 flex items-center px-5 gap-4 relative">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-white select-none">
            {shop.businessName[0].toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-white text-base truncate group-hover:underline">
            {shop.businessName}
          </h3>
          {(shop.city || shop.area) && (
            <p className="text-purple-200 text-xs truncate">
              {[shop.city, shop.area].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        {shop.deliveryAvailable && (
          <span className="absolute top-2.5 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            Delivery
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {shop.averageRating > 0 ? (
              <>
                <Stars rating={shop.averageRating} />
                <span className="text-xs font-bold text-gray-700">{shop.averageRating.toFixed(1)}</span>
                <span className="text-[10px] text-gray-400">({shop.reviewCount})</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No reviews yet</span>
            )}
          </div>
          <span className="text-xs text-gray-400 font-medium">{shop.productCount} products</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-auto">
          {shop.deliveryAvailable && (
            <span className="bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Delivery available
            </span>
          )}
          {shop.warrantyAvailable && (
            <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Warranty
            </span>
          )}
          {shop.workingHours && (
            <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {shop.workingHours}
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-purple-50 flex items-center justify-between">
          <span className="text-xs text-purple-600 font-bold group-hover:underline">View Shop</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

export default function ShopsPage() {
  const [shops,    setShops]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [city,     setCity]     = useState('All Emirates')

  useEffect(() => {
    fetch('/api/shops')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setShops(data.shops ?? [])
      })
      .catch(err => setError(err.message || 'Failed to load shops.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = shops.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.businessName.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)
    const matchCity   = city === 'All Emirates' || s.city === city
    return matchSearch && matchCity
  })

  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />

      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/" className="hover:text-purple-600 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">All Shops</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">All Shops</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {shops.length} verified shop{shops.length !== 1 ? 's' : ''} on Tobaki
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search by shop name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {EMIRATES.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-95 border ${
                  city === c
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {!loading && (
          <p className="text-sm text-gray-500">
            {filtered.length} shop{filtered.length !== 1 ? 's' : ''}{search || city !== 'All Emirates' ? ' found' : ''}
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-purple-50 animate-pulse overflow-hidden">
                <div className="h-20 bg-purple-50" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-purple-50 rounded w-1/2" />
                  <div className="h-3 bg-purple-50 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-purple-50 shadow-sm py-20 text-center">
            <p className="text-gray-500 font-semibold text-lg">No shops found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search or remove filters.</p>
            {(search || city !== 'All Emirates') && (
              <button
                onClick={() => { setSearch(''); setCity('All Emirates') }}
                className="mt-4 text-sm font-bold text-purple-600 hover:underline active:scale-95 transition-all"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(shop => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
