'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { addToCart } from '../../lib/cart'
import { getLocaleCookie, productName } from '../../lib/i18n'

const STATUS_STYLES = {
  PLACED:           'bg-yellow-100 text-yellow-700',
  SHOP_CONFIRMED:   'bg-blue-100   text-blue-700',
  PREPARING:        'bg-orange-100 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED:        'bg-green-100  text-green-700',
  CANCELLED:        'bg-red-100    text-red-700',
}

export default function OrdersPage() {
  const router = useRouter()

  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [ready,      setReady]      = useState(false)
  const [reordering, setReordering] = useState(null)
  const [reorderMsg, setReorderMsg] = useState('')
  const [locale,     setLocale]     = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  function handleReorder(order) {
    if (!order.items?.length) return
    let uid = 'guest'
    try {
      const raw = localStorage.getItem('wasla_user')
      uid = raw ? (JSON.parse(raw)?.id ?? 'guest') : 'guest'
    } catch { /* ignore */ }

    let added = 0
    for (const item of order.items) {
      const v = item.productVariant
      if (!v) continue
      addToCart({
        productVariantId: v.id,
        productId:        v.product?.id ?? 0,
        productName:      v.product?.name ?? 'Product',
        productNameEn:    v.product?.nameEn ?? '',
        brand:            v.product?.brand ?? '',
        label:            v.label         ?? '',
        price:         Number(item.priceAtPurchase),
        quantity:         item.quantity,
        sellerId:         order.sellerId ?? 0,
        sellerName:       order.seller?.businessName ?? '',
      }, uid)
      added++
    }
    if (added > 0) {
      setReorderMsg(`${added} item${added !== 1 ? 's' : ''} added to cart`)
      setTimeout(() => setReorderMsg(''), 3000)
      router.push('/cart')
    }
  }

  // Auth guard — customers only
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wasla_user')
      if (!raw) { router.replace('/login?redirect=/orders'); return }
      const u = JSON.parse(raw)
      if (u.role !== 'customer') { router.replace('/'); return }
    } catch {
      router.replace('/login')
    }
    setReady(true)
  }, [router])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(data.orders ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (ready) fetchOrders() }, [ready, fetchOrders])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#FBF6EF] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
          {!loading && (
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-32" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
            <p className="text-gray-500 font-semibold text-lg">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Start shopping to place your first order.</p>
            <Link
              href="/products"
              className="inline-block mt-5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-900">Order #{order.id}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status?.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-black text-gray-900 tabular-nums">EGP {Number(order.total).toFixed(2)}</span>
                    <span className="text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-5 py-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Items</p>
                  <div className="space-y-1">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-gray-700 truncate">
                          {item.productVariant?.product ? productName(item.productVariant.product, locale) : 'Product'}
                          {item.productVariant?.label ? ` · ${item.productVariant.label}` : ''}
                        </span>
                        <span className="shrink-0 text-gray-500 font-medium">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {order.seller?.businessName && (
                    <p className="text-xs text-gray-400 mt-2">Seller: {order.seller.businessName}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-[#FBF6EF] border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 gap-2 flex-wrap">
                  <span className="capitalize">Payment: {order.paymentMethod ?? 'cash'}</span>
                  {order.status === 'DELIVERED' && (
                    <button
                      onClick={() => handleReorder(order)}
                      className="text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors"
                    >
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
