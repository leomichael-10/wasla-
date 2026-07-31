'use client'
import Link from 'next/link'
import { useState, useEffect, useLayoutEffect } from 'react'
import { getCart, addToCart, updateQuantity } from '../lib/cart'
import CategoryIcon from './CategoryIcon'
import { t } from '../lib/i18n'

// Product tile for the Browse grid: image (or category-icon placeholder),
// name, price, and a round "+" add-to-cart button pinned to the tile's
// bottom inline-end corner. Once in cart it becomes a −/qty/+ stepper in
// the same spot — quick-commerce pattern, no detail-page hop needed.
export default function BrowseProductTile({ product, locale }) {
  const [userId, setUserId] = useState('guest')
  const [qty,    setQty]    = useState(0)

  const variant     = product.variants?.[0] ?? null
  const outOfZone   = product.seller?.deliversToZone === false
  const inStock     = variant?.inStock !== false
  const canAdd      = variant && inStock && !outOfZone
  const mainImage   = product.images?.[0] || null
  const price       = Number(variant?.price ?? 0)

  useLayoutEffect(() => {
    try {
      const raw  = localStorage.getItem('wasla_user')
      const user = raw ? JSON.parse(raw) : null
      if (user?.id) setUserId(user.id)
    } catch { /* ignore */ }
  }, [])

  const syncQty = () => {
    if (!variant) return
    const item = getCart(userId).find(c => c.productVariantId === variant.id)
    setQty(item?.quantity ?? 0)
  }

  useEffect(() => {
    syncQty()
    window.addEventListener('cartUpdated', syncQty)
    return () => window.removeEventListener('cartUpdated', syncQty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, variant?.id])

  function handleAdd(e) {
    e.preventDefault()
    if (!canAdd) return
    addToCart({
      productVariantId: variant.id,
      productId:        product.id,
      productName:      product.name,
      brand:            product.brand ?? '',
      label:            variant.label ?? '',
      price:            Number(variant.price),
      quantity:         1,
      sellerId:         product.seller?.id ?? 0,
      sellerName:       product.seller?.businessName ?? '',
    }, userId)
  }

  function handleStep(e, delta) {
    e.preventDefault()
    if (!variant) return
    updateQuantity(variant.id, qty + delta, userId)
  }

  return (
    <div className={`relative bg-white rounded-2xl border border-brand-50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${!canAdd ? 'opacity-70' : ''}`}>
      <Link href={`/products/${product.id}`} className="block">
        <div className="aspect-square bg-[#FBF6EF] flex items-center justify-center relative">
          {mainImage ? (
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <CategoryIcon slug={product.category?.icon} name={product.category?.name} locale={locale} className="w-20 h-20" />
          )}
        </div>
      </Link>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <Link href={`/products/${product.id}`} className="block">
          <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 min-h-8">{product.name}</p>
        </Link>
        <p className="text-sm font-black text-gray-900">EGP {price.toFixed(0)}</p>
        {!canAdd && (
          <p className="text-[10px] text-red-500 font-bold">
            {outOfZone ? t('browse.outOfZone', locale) : t('browse.outOfStock', locale)}
          </p>
        )}
      </div>

      {canAdd && (
        <div className="absolute bottom-2 end-2 grid">
          {/* Both states stay mounted and cross-fade/scale in place — a
              conditional unmount here would swap them with no bridge. */}
          <div
            className="col-start-1 row-start-1 flex items-center bg-brand-700 rounded-full shadow-md overflow-hidden h-8 transition-[opacity,transform] duration-160"
            style={{
              transitionTimingFunction: 'var(--ease-out)',
              opacity:        qty > 0 ? 1 : 0,
              transform:      qty > 0 ? 'scale(1)' : 'scale(0.92)',
              pointerEvents:  qty > 0 ? 'auto' : 'none',
            }}
          >
            <button
              onClick={e => handleStep(e, -1)}
              aria-label="Decrease quantity"
              className="w-8 h-full flex items-center justify-center text-white font-black active:scale-95 transition-transform"
            >
              −
            </button>
            <span className="text-white text-xs font-black tabular-nums px-0.5 min-w-4 text-center">{qty}</span>
            <button
              onClick={e => handleStep(e, 1)}
              disabled={qty >= 10}
              aria-label="Increase quantity"
              className="w-8 h-full flex items-center justify-center text-white font-black disabled:opacity-40 active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAdd}
            aria-label={t('browse.addToCart', locale)}
            className="col-start-1 row-start-1 w-9 h-9 rounded-full bg-accent-400 hover:bg-accent-500 active:scale-95 text-gray-900 font-black text-lg shadow-md flex items-center justify-center transition-[opacity,transform] duration-160"
            style={{
              transitionTimingFunction: 'var(--ease-out)',
              opacity:       qty > 0 ? 0 : 1,
              transform:     qty > 0 ? 'scale(0.92)' : 'scale(1)',
              pointerEvents: qty > 0 ? 'none' : 'auto',
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
