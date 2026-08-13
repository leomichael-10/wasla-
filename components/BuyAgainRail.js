'use client'
import { useState, useEffect } from 'react'
import { useUser } from '../lib/UserContext'
import { getLocaleCookie, t } from '../lib/i18n'
import ProductTile from './ProductTile'

// Reorder-from-history rail — the quick-commerce replacement for a wishlist.
// Only meaningful for signed-in customers with past delivered orders.
export default function BuyAgainRail() {
  const { user }  = useUser()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [locale,  setLocale]  = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    if (!user || user.role !== 'customer') { setLoading(false); return }
    const token = localStorage.getItem('wasla_token')
    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const seen = new Map()
        for (const order of data.orders ?? []) {
          for (const item of order.items ?? []) {
            const variant = item.productVariant
            const product = variant?.product
            if (!product || seen.has(product.id)) continue
            seen.set(product.id, {
              id:          product.id,
              name:        product.name,
              nameEn:      product.nameEn,
              brand:       product.brand,
              images:      product.images ?? [],
              seller:      order.seller,
              variants:    [{ id: variant.id, label: variant.label, price: variant.price, stockQty: variant.stockQty ?? 1, inStock: true }],
            })
          }
        }
        setItems([...seen.values()].slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading || items.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-lg font-black text-gray-900 mb-3">{t('home.buyAgain', locale)}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {items.map(product => (
          <div key={product.id} className="w-36 shrink-0">
            <ProductTile product={product} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  )
}
