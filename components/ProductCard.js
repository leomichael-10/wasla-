'use client'
import Link from 'next/link'
import { useState, useLayoutEffect } from 'react'
import { addToCart } from '../lib/cart'

function StarRating({ rating, count }) {
  const rounded = Math.round(rating * 2) / 2
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`text-xs ${i < rounded ? 'text-accent-400' : 'text-gray-200'}`}>&#9733;</span>
        ))}
      </div>
      {count > 0 && <span className="text-[11px] text-gray-400">({count})</span>}
    </div>
  )
}

export default function ProductCard({ product }) {
  const [feedback,    setFeedback]    = useState(false)
  const [userId,      setUserId]      = useState('guest')

  const prices     = product.variants.map(v => Number(v.price))
  const minPrice   = Math.min(...prices)
  const maxPrice   = Math.max(...prices)
  const priceLabel = minPrice === maxPrice
    ? `EGP ${minPrice.toFixed(0)}`
    : `EGP ${minPrice.toFixed(0)}–${maxPrice.toFixed(0)}`

  const variantLabels   = product.variants.map(v => v.label).filter(Boolean)
  const shopClosed      = product.seller?.isOpen === false
  const outOfZone       = product.seller?.deliversToZone === false
  const unavailable     = shopClosed || outOfZone
  const inStockVariant  = unavailable ? null : (product.variants.find(v => v.inStock ?? v.stockQty > 0) ?? null)
  const mainImage       = product.images?.[0] || product.variants?.find(v => v.image)?.image || null

  const reviews     = product.reviews ?? []
  const avgRating   = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : (product.averageRating ?? 0)
  const reviewCount = product.reviewCount ?? reviews.length

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
      productId:        product.id,
      productName:      product.name,
      brand:            product.brand ?? '',
      label:            inStockVariant.label ?? '',
      price:         Number(inStockVariant.price),
      quantity:         1,
      sellerId:         product.seller?.id ?? 0,
      sellerName:       product.seller?.businessName ?? '',
    }, userId)
    setFeedback(true)
    setTimeout(() => setFeedback(false), 2000)
  }

  return (
    <div className={`relative group bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-brand-50 hover:border-brand-200 overflow-hidden flex flex-col h-full ${unavailable ? 'opacity-60 grayscale-35' : ''}`}>

      <Link href={`/products/${product.id}`} className="absolute inset-0 z-0" aria-label={`View ${product.name}`} />

      <div className="relative bg-linear-to-br from-brand-700 to-brand-500 pt-5 pb-8 px-4 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full bg-white border-4 border-white/80 overflow-hidden flex items-center justify-center shadow-lg">
          {mainImage ? (
            <img src={mainImage} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <span className="text-4xl font-black text-brand-200 select-none tracking-tighter">
              {(product.brand ?? 'V')[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 translate-y-1/2 right-4 bg-accent-400 text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg z-10">
          {priceLabel}
        </div>
      </div>

      <div className="pt-6 px-4 pb-4 flex flex-col flex-1 gap-1.5">
        {product.brand && (
          <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wide">{product.brand}</span>
        )}
        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-10">{product.name}</h3>
        {variantLabels.length > 0 ? (
          <p className="text-xs text-gray-400 leading-tight">
            {variantLabels.length} option{variantLabels.length !== 1 ? 's' : ''}{' · '}
            {variantLabels.slice(0, 2).join(', ')}{variantLabels.length > 2 ? '…' : ''}
          </p>
        ) : (
          <p className="text-xs text-gray-400 leading-tight min-h-4" />
        )}
        {reviewCount > 0 && <StarRating rating={avgRating} count={reviewCount} />}
        {product.seller && (
          <Link
            href={`/shops/${product.seller.id}`}
            className="relative z-10 text-xs text-gray-400 hover:text-brand-600 transition-colors"
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
                  ? 'bg-brand-700 hover:bg-brand-800'
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
            ) : inStockVariant ? 'Add to Cart' : shopClosed ? 'Shop Closed' : outOfZone ? 'لا يوصل لمنطقتك' : 'Out of Stock'}
          </button>
        </div>
      </div>

    </div>
  )
}
