'use client'
import Link from 'next/link'
import { useState, useEffect, useLayoutEffect } from 'react'
import { addToCart } from '../lib/cart'

function StarRating({ rating, count }) {
  const rounded = Math.round(rating * 2) / 2
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`text-xs ${i < rounded ? 'text-amber-400' : 'text-gray-200'}`}>&#9733;</span>
        ))}
      </div>
      {count > 0 && <span className="text-[11px] text-gray-400">({count})</span>}
    </div>
  )
}

export default function ProductCard({ product }) {
  const [feedback,    setFeedback]    = useState(false)
  const [wishlisted,  setWishlisted]  = useState(false)
  const [wishLoading, setWishLoading] = useState(false)
  const [isCustomer,  setIsCustomer]  = useState(false)
  const [userId,      setUserId]      = useState('guest')

  const prices     = product.variants.map(v => Number(v.priceAed))
  const minPrice   = Math.min(...prices)
  const maxPrice   = Math.max(...prices)
  const priceLabel = minPrice === maxPrice
    ? `AED ${minPrice.toFixed(0)}`
    : `AED ${minPrice.toFixed(0)}–${maxPrice.toFixed(0)}`

  const flavors        = product.variants.map(v => v.flavor).filter(Boolean)
  const inStockVariant = product.variants.find(v => v.inStock ?? v.stockQty > 0) ?? null
  const mainImage      = product.images?.[0] ?? null

  const reviews     = product.reviews ?? []
  const avgRating   = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : (product.averageRating ?? 0)
  const reviewCount = product.reviewCount ?? reviews.length

  useLayoutEffect(() => {
    try {
      const raw  = localStorage.getItem('tobaki_user')
      const user = raw ? JSON.parse(raw) : null
      if (user?.id) setUserId(user.id)
      if (user?.role === 'customer') setIsCustomer(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!isCustomer) return
    const token = localStorage.getItem('tobaki_token')
    fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const ids = (data.wishlist ?? []).map(w => w.id)
        setWishlisted(ids.includes(product.id))
      })
      .catch(() => {})
  }, [product.id, isCustomer])

  function handleAddToCart(e) {
    e.preventDefault()
    if (!inStockVariant) return
    addToCart({
      productVariantId: inStockVariant.id,
      productId:        product.id,
      productName:      product.name,
      brand:            product.brand ?? '',
      flavor:           inStockVariant.flavor ?? '',
      nicotineLevel:    inStockVariant.nicotineLevel ?? '',
      puffCount:        inStockVariant.puffCount ?? 0,
      priceAed:         Number(inStockVariant.priceAed),
      quantity:         1,
      sellerId:         product.seller?.id ?? 0,
      sellerName:       product.seller?.businessName ?? '',
    }, userId)
    setFeedback(true)
    setTimeout(() => setFeedback(false), 2000)
  }

  async function handleWishlist(e) {
    e.preventDefault()
    if (!isCustomer || wishLoading) return
    setWishLoading(true)
    const token  = localStorage.getItem('tobaki_token')
    const method = wishlisted ? 'DELETE' : 'POST'
    try {
      const res = await fetch('/api/wishlist', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId: product.id }),
      })
      if (res.ok) setWishlisted(prev => !prev)
    } catch { /* ignore */ } finally {
      setWishLoading(false)
    }
  }

  return (
    <div className="relative group bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-purple-50 hover:border-purple-200 overflow-hidden flex flex-col h-full">

      <Link href={`/products/${product.id}`} className="absolute inset-0 z-0" aria-label={`View ${product.name}`} />

      <div className="relative bg-linear-to-br from-purple-700 to-violet-600 pt-5 pb-8 px-4 flex items-center justify-center">
        {isCustomer && (
          <button
            onClick={handleWishlist}
            disabled={wishLoading}
            className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill={wishlisted ? '#ef4444' : 'none'}
              stroke={wishlisted ? '#ef4444' : 'white'}
              strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        )}

        <div className="w-28 h-28 rounded-full bg-white border-4 border-white/80 overflow-hidden flex items-center justify-center shadow-lg">
          {mainImage ? (
            <img src={mainImage} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <span className="text-4xl font-black text-purple-200 select-none tracking-tighter">
              {(product.brand ?? 'V')[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 translate-y-1/2 right-4 bg-amber-400 text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg z-10">
          {priceLabel}
        </div>
      </div>

      <div className="pt-6 px-4 pb-4 flex flex-col flex-1 gap-1.5">
        {product.brand && (
          <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wide">{product.brand}</span>
        )}
        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-10">{product.name}</h3>
        {flavors.length > 0 ? (
          <p className="text-xs text-gray-400 leading-tight">
            {flavors.length} flavor{flavors.length !== 1 ? 's' : ''}{' · '}
            {flavors.slice(0, 2).join(', ')}{flavors.length > 2 ? '…' : ''}
          </p>
        ) : (
          <p className="text-xs text-gray-400 leading-tight min-h-4" />
        )}
        {reviewCount > 0 && <StarRating rating={avgRating} count={reviewCount} />}
        {product.seller && (
          <Link
            href={`/shops/${product.seller.id}`}
            className="relative z-10 text-xs text-gray-400 hover:text-purple-600 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            {product.seller.businessName}{product.seller.city ? ` · ${product.seller.city}` : ''}
          </Link>
        )}

        <div className="mt-auto pt-2">
          <button
            className={`relative z-10 w-full text-white text-xs font-bold py-2.5 rounded-2xl active:scale-95 transition-all duration-200 ${
              feedback
                ? 'bg-green-500 scale-95'
                : inStockVariant
                  ? 'bg-purple-700 hover:bg-purple-800'
                  : 'bg-gray-300 cursor-not-allowed'
            }`}
            onClick={handleAddToCart}
            disabled={!inStockVariant}
          >
            {feedback ? (
              <span className="flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                Added!
              </span>
            ) : inStockVariant ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>

    </div>
  )
}
