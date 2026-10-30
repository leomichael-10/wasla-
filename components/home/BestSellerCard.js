'use client'
import Link from 'next/link'
import { useState, useLayoutEffect } from 'react'
import { toast } from 'sonner'
import { addToCart } from '../../lib/cart'
import MediaThumb from '../MediaThumb'
import { productName, formatPrice, t } from '../../lib/i18n'

export default function BestSellerCard({ product, locale }) {
  const displayName = productName(product, locale)
  const [userId, setUserId] = useState('guest')

  const shopClosed     = product.seller?.isOpen === false
  const outOfZone      = product.seller?.deliversToZone === false
  const unavailable     = shopClosed || outOfZone
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

  function handleAdd() {
    if (!inStockVariant) return
    addToCart({
      productVariantId: inStockVariant.id,
      productId:        product.id,
      productName:      product.name,
      productNameEn:    product.nameEn ?? '',
      image:            mainImage,
      brand:            product.brand ?? '',
      label:            inStockVariant.label ?? '',
      price:            Number(inStockVariant.price),
      quantity:         1,
      sellerId:         product.seller?.id ?? 0,
      sellerName:       product.seller?.businessName ?? '',
    }, userId)
    toast.success(t('product.addedToCart', locale))
  }

  const disabled   = unavailable || !inStockVariant
  const statusText = shopClosed ? t('browse.shopClosed', locale)
    : outOfZone ? t('browse.outOfZone', locale)
    : !inStockVariant ? t('browse.outOfStock', locale)
    : null

  return (
    <div className="bg-wasla-card rounded-xl border border-brand-100 overflow-hidden flex flex-col h-full">
      <Link href={`/products/${product.id}`} className="block">
        <MediaThumb src={mainImage} alt={displayName} className="aspect-square bg-wasla-cream" />
      </Link>

      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <Link href={`/products/${product.id}`} className="block">
          <p className="text-xs font-bold text-brand-900 leading-snug line-clamp-2 min-h-8"><bdi>{displayName}</bdi></p>
        </Link>
        <p className="text-sm font-black text-wasla-orange">{formatPrice(price, locale)}</p>

        <button
          onClick={handleAdd}
          disabled={disabled}
          className="mt-auto w-full h-9 flex items-center justify-center gap-1.5 bg-wasla-orange disabled:bg-gray-200 text-white disabled:text-gray-400 text-xs font-black rounded-xl transition-colors active:scale-95 disabled:active:scale-100"
        >
          {disabled ? (
            statusText
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              {t('product.addToCart', locale)}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
