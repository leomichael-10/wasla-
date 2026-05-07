'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { getCart, removeFromCart, updateQuantity, clearCart } from '../../lib/cart'

const DELIVERY_FEE = 10

export default function CartPage() {
  const router = useRouter()

  const [cartItems,   setCartItems]   = useState([])
  const [user,        setUser]        = useState(null)
  const [userId,      setUserId]      = useState('guest')
  const [address,     setAddress]     = useState('')
  const [placing,     setPlacing]     = useState(false)
  const [error,       setError]       = useState('')

  const reload = useCallback((uid) => {
    const sorted = [...getCart(uid ?? 'guest')].sort((a, b) => a.productName.localeCompare(b.productName))
    setCartItems(sorted)
  }, [])

  useEffect(() => {
    let uid = 'guest'
    try {
      const raw = localStorage.getItem('tobaki_user')
      if (raw) {
        const u = JSON.parse(raw)
        setUser(u)
        uid = u?.id ?? 'guest'
        setUserId(uid)
        // Pre-fill address from profile
        const token = localStorage.getItem('tobaki_token')
        if (u.role === 'customer' && token) {
          fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
              const saved = data.user?.customerProfile?.deliveryAddress
              if (saved) setAddress(saved)
            })
            .catch(() => {})
        }
      }
    } catch { /* ignore */ }
    reload(uid)
    function onCartUpdated() { reload(uid) }
    window.addEventListener('cartUpdated', onCartUpdated)
    return () => window.removeEventListener('cartUpdated', onCartUpdated)
  }, [reload])

  const subtotal = cartItems.reduce((sum, item) => sum + item.priceAed * item.quantity, 0)
  const total    = subtotal + (cartItems.length > 0 ? DELIVERY_FEE : 0)

  async function handleCheckout() {
    if (!user) {
      router.push('/login?redirect=/cart')
      return
    }
    if (!address.trim()) {
      setError('Please enter a delivery address.')
      return
    }
    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }

    setError('')
    setPlacing(true)
    const token = localStorage.getItem('tobaki_token')

    // Group items by sellerId
    const grouped = {}
    for (const item of cartItems) {
      const key = item.sellerId
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    }

    const placedOrders = []
    try {
      for (const [sellerIdStr, items] of Object.entries(grouped)) {
        const res  = await fetch('/api/orders', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            sellerId:        parseInt(sellerIdStr, 10),
            deliveryAddress: address.trim(),
            paymentMethod:   'cash',
            items:           items.map(i => ({
              productVariantId: i.productVariantId,
              quantity:         i.quantity,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Order failed')
        placedOrders.push(data.order)
      }

      // Save delivery address back to profile
      const token2 = localStorage.getItem('tobaki_token')
      fetch('/api/profile', {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token2}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deliveryAddress: address.trim() }),
      }).catch(() => {})

      localStorage.setItem('tobaki_last_orders', JSON.stringify(placedOrders))
      clearCart(userId)
      router.push('/orders/confirmation')
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Your Cart</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
            <p className="text-gray-500 font-semibold text-lg">Your cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">Browse products and add something you like.</p>
            <Link
              href="/products"
              className="inline-block mt-5 bg-teal-400 hover:bg-teal-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* Cart items */}
            <div className="flex-1 space-y-3">
              {cartItems.map(item => (
                <div key={item.productVariantId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm leading-snug">
                        {item.productName}
                        {item.brand ? ` · ${item.brand}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.flavor && (
                          <span className="text-[11px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full">{item.flavor}</span>
                        )}
                        {item.nicotineLevel && (
                          <span className="text-[11px] bg-yellow-50 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">{item.nicotineLevel} nic</span>
                        )}
                        {item.puffCount && (
                          <span className="text-[11px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-full">{item.puffCount.toLocaleString()} puffs</span>
                        )}
                      </div>
                      {item.sellerName && (
                        <p className="text-xs text-gray-400 mt-1">Sold by {item.sellerName}</p>
                      )}
                    </div>

                    {/* Price + remove */}
                    <div className="shrink-0 text-right">
                      <p className="font-black text-gray-900 text-sm tabular-nums">
                        AED {(item.priceAed * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">AED {item.priceAed.toFixed(2)} each</p>
                      <button
                        onClick={() => removeFromCart(item.productVariantId, userId)}
                        className="mt-2 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productVariantId, item.quantity - 1, userId)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors font-bold text-lg"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productVariantId, item.quantity + 1, userId)}
                        disabled={item.quantity >= 10}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">Max 10 per item</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="lg:w-80 shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h2 className="font-black text-gray-900">Order Summary</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold tabular-nums">AED {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="font-semibold tabular-nums">AED {DELIVERY_FEE.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-gray-900 text-base">
                    <span>Total</span>
                    <span className="tabular-nums">AED {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout section */}
                {user?.role === 'customer' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Delivery Address <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Enter your full delivery address…"
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Method</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked readOnly className="accent-teal-400" />
                          <span className="text-sm text-gray-700">Cash on Delivery</span>
                        </label>
                        <label className="flex items-center gap-2 opacity-40 cursor-not-allowed">
                          <input type="radio" disabled className="accent-teal-400" />
                          <span className="text-sm text-gray-500">Card (coming soon)</span>
                        </label>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-500 font-semibold">{error}</p>
                    )}

                    <button
                      onClick={handleCheckout}
                      disabled={placing}
                      className="w-full bg-teal-400 hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-colors"
                    >
                      {placing ? 'Placing Order…' : 'Confirm Order'}
                    </button>
                  </>
                ) : (
                  <div>
                    {error && <p className="text-xs text-red-500 font-semibold mb-2">{error}</p>}
                    <Link
                      href="/login?redirect=/cart"
                      className="block w-full text-center bg-teal-400 hover:bg-teal-500 text-white font-black py-3 rounded-xl text-sm transition-colors"
                    >
                      Sign in to Checkout
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/products"
                className="block text-center text-sm font-semibold text-gray-500 hover:text-teal-600 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
