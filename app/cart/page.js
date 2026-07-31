'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import AddressForm from '../../components/AddressForm'
import AddressCard from '../../components/AddressCard'
import { getCart, removeFromCart, updateQuantity, clearCart } from '../../lib/cart'
import { getLocaleCookie, t } from '../../lib/i18n'

export default function CartPage() {
  const router = useRouter()

  const [cartItems,   setCartItems]   = useState([])
  const [user,        setUser]        = useState(null)
  const [userId,      setUserId]      = useState('guest')
  const [addresses,   setAddresses]   = useState([])
  const [zones,       setZones]       = useState([])
  const [addressId,   setAddressId]   = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [placing,     setPlacing]     = useState(false)
  const [error,       setError]       = useState('')
  const [quotes,      setQuotes]      = useState({})
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [locale,      setLocale]      = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  const selectedAddress = addresses.find(a => a.id === addressId) ?? null
  const zone = selectedAddress?.zone
    ? { id: selectedAddress.zoneId, nameEn: selectedAddress.zone.nameEn, nameAr: selectedAddress.zone.nameAr }
    : null

  const loadAddresses = useCallback((token) => {
    fetch('/api/addresses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const list = data.addresses ?? []
        setAddresses(list)
        const def = list.find(a => a.isDefault) ?? list[0]
        if (def) setAddressId(def.id)
      })
      .catch(() => {})
  }, [])

  const reload = useCallback((uid) => {
    const sorted = [...getCart(uid ?? 'guest')].sort((a, b) => a.productName.localeCompare(b.productName))
    setCartItems(sorted)
  }, [])

  useEffect(() => {
    let uid = 'guest'
    try {
      const raw = localStorage.getItem('wasla_user')
      if (raw) {
        const u = JSON.parse(raw)
        setUser(u)
        uid = u?.id ?? 'guest'
        setUserId(uid)
        const token = localStorage.getItem('wasla_token')
        if (u.role === 'customer' && token) {
          loadAddresses(token)
        }
      }
    } catch { /* ignore */ }
    reload(uid)
    function onCartUpdated() { reload(uid) }
    window.addEventListener('cartUpdated', onCartUpdated)
    return () => window.removeEventListener('cartUpdated', onCartUpdated)
  }, [reload, loadAddresses])

  useEffect(() => {
    fetch('/api/zones').then(r => r.json()).then(data => setZones(data.zones ?? [])).catch(() => {})
  }, [])

  const sellerIds = [...new Set(cartItems.map(i => i.sellerId).filter(Boolean))]

  useEffect(() => {
    if (!zone || sellerIds.length === 0) { setQuotes({}); return }
    fetch(`/api/delivery/quote?zoneId=${zone.id}&sellerIds=${sellerIds.join(',')}`)
      .then(r => r.json())
      .then(data => {
        const map = Object.fromEntries((data.quotes ?? []).map(q => [q.sellerId, q]))
        setQuotes(map)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, JSON.stringify(sellerIds)])

  const subtotal    = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = sellerIds.reduce((sum, id) => sum + (quotes[id]?.covered ? quotes[id].fee : 0), 0)
  const total       = subtotal + deliveryFee
  const anyUncovered = zone ? sellerIds.some(id => quotes[id] && !quotes[id].covered) : false

  async function handleCheckout() {
    if (!user) {
      router.push('/login?redirect=/cart')
      return
    }
    if (!addressId) {
      setError('Please select a delivery address.')
      return
    }
    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }
    if (!zone) {
      setError(t('checkout.outOfArea', locale))
      return
    }
    if (anyUncovered) {
      setError('One or more shops in your cart don\'t deliver to your area yet. Remove those items to continue.')
      return
    }

    setError('')
    setPlacing(true)
    const token = localStorage.getItem('wasla_token')

    const grouped = {}
    for (const item of cartItems) {
      const key = item.sellerId
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    }

    const orderGroupId = crypto.randomUUID()
    const placedOrders = []
    try {
      for (const [sellerIdStr, items] of Object.entries(grouped)) {
        const sellerId = parseInt(sellerIdStr, 10)
        const quote    = quotes[sellerId]
        const res  = await fetch('/api/orders', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            sellerId,
            addressId,
            paymentMethod,
            orderGroupId:    Object.keys(grouped).length > 1 ? orderGroupId : null,
            items:           items.map(i => ({
              productVariantId: i.productVariantId,
              quantity:         i.quantity,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (data.code === 'EMAIL_NOT_VERIFIED') {
            router.push(`/verify-email?email=${encodeURIComponent(user?.email ?? '')}`)
            return
          }
          throw new Error(data.error ?? 'Order failed')
        }
        placedOrders.push(data.order)
      }

      localStorage.setItem('wasla_last_orders', JSON.stringify(placedOrders))
      clearCart(userId)
      router.push('/orders/confirmation')
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6">{t('cart.title', locale)}</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-brand-50 shadow-sm py-20 text-center">
            <p className="text-gray-500 font-semibold text-lg">Your cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">Browse products and add something you like.</p>
            <Link
              href="/products"
              className="inline-block mt-5 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white text-sm font-bold px-6 py-2.5 rounded-2xl transition-all duration-200"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            <div className="flex-1 space-y-3">
              {cartItems.map(item => (
                <div key={item.productVariantId} className="bg-white rounded-3xl border border-brand-50 shadow-sm p-4 transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm leading-snug">
                        {item.productName}
                        {item.brand ? ` · ${item.brand}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.label && (
                          <span className="text-[11px] bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full">{item.label}</span>
                        )}
                      </div>
                      {item.sellerName && (
                        <p className="text-xs text-gray-400 mt-1">Sold by {item.sellerName}</p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black text-gray-900 text-sm tabular-nums">
                        EGP {(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">EGP {item.price.toFixed(2)} each</p>
                      <button
                        onClick={() => removeFromCart(item.productVariantId, userId)}
                        className="mt-2 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-brand-100 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productVariantId, item.quantity - 1, userId)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-brand-50 transition-colors font-bold text-lg"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productVariantId, item.quantity + 1, userId)}
                        disabled={item.quantity >= 10}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-brand-50 disabled:opacity-30 transition-colors font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">Max 10 per item</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:w-80 shrink-0 space-y-4">
              <div className="bg-white rounded-3xl border border-brand-50 shadow-sm p-5 space-y-4">
                <h2 className="font-black text-gray-900">Order Summary</h2>

                {!zone && (
                  <p className="text-xs bg-accent-50 text-accent-700 font-semibold rounded-xl px-3 py-2">
                    Select your delivery area to see fees and ETA.
                  </p>
                )}

                {zone && sellerIds.length > 0 && (
                  <div className="space-y-1.5">
                    {sellerIds.map(id => {
                      const q     = quotes[id]
                      const items = cartItems.filter(i => i.sellerId === id)
                      const name  = items[0]?.sellerName || 'Shop'
                      if (!q) return null
                      return (
                        <div key={id} className="text-xs bg-[#FBF6EF] rounded-xl px-3 py-2">
                          <p className="font-bold text-gray-800">{name}</p>
                          {q.covered ? (
                            <p className="text-gray-500 mt-0.5">
                              Delivery EGP {q.fee.toFixed(2)} · {q.sameDay ? 'Same-day' : 'Next-day'}
                              {q.minOrderValue > 0 && ` · Min order EGP ${q.minOrderValue.toFixed(0)}`}
                            </p>
                          ) : (
                            <p className="text-red-500 font-semibold mt-0.5">لا يوصل لمنطقتك — doesn't deliver to your area</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{t('cart.subtotal', locale)}</span>
                    <span className="font-semibold tabular-nums">EGP {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t('cart.delivery', locale)}</span>
                    <span className="font-semibold tabular-nums">EGP {deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-brand-50 pt-2 flex justify-between font-black text-gray-900 text-base">
                    <span>{t('cart.total', locale)}</span>
                    <span className="tabular-nums">EGP {total.toFixed(2)}</span>
                  </div>
                </div>

                {user?.role === 'customer' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('checkout.selectAddress', locale)} <span className="text-red-400">*</span>
                      </label>

                      {showAddForm ? (
                        <AddressForm
                          zones={zones}
                          locale={locale}
                          onSaved={(saved) => {
                            setShowAddForm(false)
                            setAddresses(prev => [saved, ...prev])
                            setAddressId(saved.id)
                          }}
                          onCancel={() => setShowAddForm(false)}
                        />
                      ) : (
                        <div className="space-y-2">
                          {addresses.length === 0 && (
                            <p className="text-xs text-gray-400">{t('checkout.noAddresses', locale)}</p>
                          )}
                          {addresses.map(a => (
                            <AddressCard
                              key={a.id}
                              address={a}
                              locale={locale}
                              selectable
                              selected={a.id === addressId}
                              onSelect={(addr) => setAddressId(addr.id)}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowAddForm(true)}
                            className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors"
                          >
                            + {t('checkout.addNewAddress', locale)}
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Method</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio" checked={paymentMethod === 'cod'}
                            onChange={() => setPaymentMethod('cod')}
                            className="accent-brand-600"
                          />
                          <span className="text-sm text-gray-700">Cash on Delivery</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio" checked={paymentMethod === 'manual_transfer'}
                            onChange={() => setPaymentMethod('manual_transfer')}
                            className="accent-brand-600"
                          />
                          <span className="text-sm text-gray-700">InstaPay / Vodafone Cash (upload receipt)</span>
                        </label>
                        <label className="flex items-center gap-2 opacity-40 cursor-not-allowed">
                          <input type="radio" disabled className="accent-brand-600" />
                          <span className="text-sm text-gray-500">Card / Wallet via Paymob (coming soon)</span>
                        </label>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-500 font-semibold">{error}</p>
                    )}

                    <button
                      onClick={handleCheckout}
                      disabled={placing}
                      className="w-full bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 text-white font-black py-3 rounded-2xl text-sm transition-all duration-200"
                    >
                      {placing ? 'Placing Order…' : t('cart.checkout', locale)}
                    </button>
                  </>
                ) : (
                  <div>
                    {error && <p className="text-xs text-red-500 font-semibold mb-2">{error}</p>}
                    <Link
                      href="/login?redirect=/cart"
                      className="block w-full text-center bg-brand-700 hover:bg-brand-800 active:scale-95 text-white font-black py-3 rounded-2xl text-sm transition-all duration-200"
                    >
                      Sign in to Checkout
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/products"
                className="block text-center text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors"
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
