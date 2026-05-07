'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import ProductCard from '../../components/ProductCard'

export default function WishlistPage() {
  const router = useRouter()
  const [wishlist, setWishlist] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tobaki_user')
      if (!raw) { router.replace('/login?redirect=/wishlist'); return }
      const u = JSON.parse(raw)
      if (u.role !== 'customer') { router.replace('/'); return }
    } catch {
      router.replace('/login')
      return
    }

    const token = localStorage.getItem('tobaki_token')
    fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setWishlist(data.wishlist ?? [])
      })
      .catch(err => setError(err.message || 'Failed to load wishlist.'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleRemove(productId) {
    const token = localStorage.getItem('tobaki_token')
    try {
      await fetch('/api/wishlist', {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId }),
      })
      setWishlist(prev => prev.filter(p => p.id !== productId))
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Wishlist</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {wishlist.length} saved product{wishlist.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Link href="/products" className="text-sm font-bold text-purple-700 hover:underline">
            Browse Products
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse">
                <div className="aspect-square bg-gray-100 rounded-t-2xl" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
            <p className="text-gray-500 font-semibold text-lg">No saved products yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap the heart icon on any product to save it here.</p>
            <Link href="/products"
              className="inline-block mt-5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlist.map(product => (
              <div key={product.id} className="relative">
                <ProductCard product={product} />
                <button
                  onClick={() => handleRemove(product.id)}
                  className="absolute bottom-3 left-3 z-10 text-xs font-semibold text-red-400 hover:text-red-600 bg-white/90 px-2 py-1 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
