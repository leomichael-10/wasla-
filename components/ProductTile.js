'use client'
import Link from 'next/link'
import { useState, useEffect, useLayoutEffect } from 'react'
import { getCart, addToCart, updateQuantity } from '../lib/cart'

// Compact quick-commerce tile: image, name, price, and an inline +/- stepper
// that adds straight to cart — no detail-page hop required for staples.
export default function ProductTile({ product }) {
  const [userId, setUserId] = useState('guest')
  const [qty,    setQty]    = useState(0)

  const shopClosed     = product.seller?.isOpen === false
  const outOfZone      = product.seller?.deliversToZone === false
  const unavailable    = shopClosed || outOfZone
  const inStockVariant = unavailable ? null : (product.variants.find(v => v.inStock ?? v.stockQty > 0) ?? null)
  const mainImage      = product.images?.[0] || product.variants?.find(v => v.image)?.image || null
  const price          = inStockVariant ? Number(inStockVariant.price) : Number(product.variants?.[0]?.price ?? 0)

  useLayoutEffect(() => {
    try {
      const raw  = localStorage.getItem('wasla_user')
      const user = raw ? JSON.parse(raw) : null
      if (user?.id) setUserId(user.id)
    } catch { /* ignore */ }
  }, [])

  const syncQty = () => {
    if (!inStockVariant) return
    const item = getCart(userId).find(c => c.productVariantId === inStockVariant.id)
    setQty(item?.quantity ?? 0)
  }

  useEffect(() => {
    syncQty()
    window.addEventListener('cartUpdated', syncQty)
    return () => window.removeEventListener('cartUpdated', syncQty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, inStockVariant?.id])

  function handleAdd(e) {
    e.preventDefault()
    if (!inStockVariant) return
    addToCart({
      productVariantId: inStockVariant.id,
      productId:        product.id,
      productName:      product.name,
      brand:            product.brand ?? '',
      label:            inStockVariant.label ?? '',
      price:            Number(inStockVariant.price),
      quantity:         1,
      sellerId:         product.seller?.id ?? 0,
      sellerName:       product.seller?.businessName ?? '',
    }, userId)
  }

  function handleStep(e, delta) {
    e.preventDefault()
    if (!inStockVariant) return
    updateQuantity(inStockVariant.id, qty + delta, userId)
  }

  return (
    <div className={`relative bg-white rounded-2xl border border-brand-50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${unavailable ? 'opacity-60 grayscale-35' : ''}`}>
      <Link href={`/products/${product.id}`} className="block">
        <div className="aspect-square bg-[#FBF6EF] flex items-center justify-center relative">
          {mainImage ? (
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-black text-brand-200 select-none">
              {(product.brand ?? product.name ?? 'W')[0].toUpperCase()}
            </span>
          )}
        </div>
      </Link>

      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <Link href={`/products/${product.id}`} className="block">
          <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 min-h-8">{product.name}</p>
        </Link>
        <p className="text-sm font-black text-gray-900">EGP {price.toFixed(0)}</p>

        <div className="mt-auto pt-1">
          {unavailable ? (
            <p className="text-[10px] text-red-500 font-bold text-center py-1.5">
              {shopClosed ? 'Shop Closed' : 'لا يوصل لمنطقتك'}
            </p>
          ) : !inStockVariant ? (
            <p className="text-[10px] text-gray-400 font-bold text-center py-1.5">Out of Stock</p>
          ) : qty > 0 ? (
            <div className="flex items-center justify-between bg-brand-700 rounded-xl overflow-hidden h-8">
              <button onClick={e => handleStep(e, -1)} className="w-8 h-full flex items-center justify-center text-white font-black active:scale-95 transition-transform">−</button>
              <span className="text-white text-xs font-black tabular-nums">{qty}</span>
              <button onClick={e => handleStep(e, 1)} disabled={qty >= 10} className="w-8 h-full flex items-center justify-center text-white font-black disabled:opacity-40 active:scale-95 transition-transform">+</button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="w-full h-8 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-black rounded-xl transition-colors active:scale-95"
            >
              + إضافة
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
