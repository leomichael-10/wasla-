'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import AddressForm from '../../components/AddressForm'
import AddressCard from '../../components/AddressCard'
import { toast } from 'sonner'
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

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const selectedAddress = addresses.find(a => a.id === addressId) ?? null
  const hasZone     = Boolean(selectedAddress?.zone)
  const zoneId      = selectedAddress?.zoneId ?? null
  const zoneNameEn  = selectedAddress?.zone?.nameEn ?? null
  const zoneNameAr  = selectedAddress?.zone?.nameAr ?? null
  const zone = useMemo(() => (
    hasZone ? { id: zoneId, nameEn: zoneNameEn, nameAr: zoneNameAr } : null
  ), [hasZone, zoneId, zoneNameEn, zoneNameAr])

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
      setError(t('checkout.errorSelectAddress', locale))
      return
    }
    if (cartItems.length === 0) {
      setError(t('checkout.errorEmptyCart', locale))
      return
    }
    if (!zone) {
      setError(t('checkout.outOfArea', locale))
      return
    }
    if (anyUncovered) {
      setError(t('checkout.errorUncovered', locale))
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
          throw new Error(data.error ?? t('checkout.errorGeneric', locale))
        }
        placedOrders.push(data.order)
      }

      localStorage.setItem('wasla_last_orders', JSON.stringify(placedOrders))
      clearCart(userId)
      toast.success(t('cart.orderPlaced', locale))
      router.push('/orders/confirmation')
    } catch (err) {
      setError(err.message || t('checkout.errorGeneric', locale))
    } finally {
      setPlacing(false)
    }
  }

  const canCheckout = !placing && Boolean(addressId) && Boolean(zone) && !anyUncovered

  return (
    <div className="min-h-screen bg-[#FBF6EF] pb-20 lg:pb-0" dir={dir}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-5 sm:mb-7">{t('cart.title', locale)}</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-brand-50 shadow-sm py-20 text-center px-4">
            <p className="text-gray-500 font-semibold text-lg">{t('cart.empty', locale)}</p>
            <p className="text-sm text-gray-400 mt-1">{t('cart.emptyHint', locale)}</p>
            <Link
              href="/products"
              className="inline-block mt-5 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white text-sm font-bold px-6 py-2.5 rounded-2xl transition-all duration-200"
            >
              {t('cart.browseProducts', locale)}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

            {/* Main: cart items — first in DOM so it sits at the inline-start
                edge (right in RTL, left in LTR) of the row, matching the
                classic checkout layout mirrored for Arabic. */}
            <div className="flex-1 w-full min-w-0 space-y-4">
              <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wide">
                {t('cart.yourItems', locale)}
              </h2>
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.productVariantId} className="bg-white rounded-3xl border border-brand-50 shadow-sm p-4 sm:p-5 transition-all duration-300">
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
                          <p className="text-xs text-gray-400 mt-1">{t('cart.soldBy', locale)} {item.sellerName}</p>
                        )}
                      </div>

                      <div className="shrink-0 text-end">
                        <p className="font-black text-gray-900 text-sm tabular-nums">
                          EGP {(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">EGP {item.price.toFixed(2)} {t('cart.each', locale)}</p>
                        <button
                          onClick={() => removeFromCart(item.productVariantId, userId)}
                          className="mt-2 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                        >
                          {t('cart.remove', locale)}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-brand-100 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productVariantId, item.quantity - 1, userId)}
                          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-brand-50 active:scale-95 transition-[background-color,transform] duration-120 font-bold text-lg"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-black text-gray-900 tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productVariantId, item.quantity + 1, userId)}
                          disabled={item.quantity >= 10}
                          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-brand-50 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-[background-color,transform] duration-120 font-bold text-lg"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-gray-400">{t('cart.maxPerItem', locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side: sticky order summary card */}
            <div className="w-full lg:w-96 shrink-0 space-y-4 lg:sticky lg:top-24">
              <div className="bg-white rounded-3xl border border-brand-50 shadow-sm p-5 sm:p-6 space-y-5">
                <h2 className="text-lg font-black text-gray-900">{t('checkout.orderSummary', locale)}</h2>

                {/* Out-of-zone alert — elevated to a proper banner, not fine print */}
                {anyUncovered && (
                  <div className="flex items-start gap-3 bg-hibiscus-50 border border-hibiscus-400/40 rounded-2xl p-3.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-hibiscus-500 shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-hibiscus-600">{t('checkout.outOfZoneTitle', locale)}</p>
                      <p className="text-xs text-hibiscus-600/90 mt-0.5 leading-relaxed">{t('checkout.outOfZoneBody', locale)}</p>
                    </div>
                  </div>
                )}

                {!zone && (
                  <div className="flex items-start gap-3 bg-accent-50 border border-accent-100 rounded-2xl p-3.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-accent-500 shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <p className="text-xs text-accent-700 font-semibold">{t('checkout.selectZoneHint', locale)}</p>
                  </div>
                )}

                {zone && sellerIds.length > 0 && (
                  <div className="space-y-1.5">
                    {sellerIds.map(id => {
                      const q     = quotes[id]
                      const items = cartItems.filter(i => i.sellerId === id)
                      const name  = items[0]?.sellerName || t('checkout.shopFallbackName', locale)
                      if (!q) return null
                      return (
                        <div key={id} className={`text-xs rounded-xl px-3 py-2 ${q.covered ? 'bg-[#FBF6EF]' : 'bg-hibiscus-50'}`}>
                          <p className="font-bold text-gray-800">{name}</p>
                          {q.covered ? (
                            <p className="text-gray-500 mt-0.5">
                              EGP {q.fee.toFixed(2)} · {q.sameDay ? t('checkout.sameDay', locale) : t('checkout.nextDay', locale)}
                              {q.minOrderValue > 0 && ` · ${t('checkout.minOrder', locale)} EGP ${q.minOrderValue.toFixed(0)}`}
                            </p>
                          ) : (
                            <p className="text-hibiscus-600 font-semibold mt-0.5">{t('checkout.outOfZoneShop', locale)}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-2 text-sm border-t border-brand-50 pt-4">
                  <div className="flex justify-between text-gray-600">
                    <span>{t('cart.subtotal', locale)}</span>
                    <span className="font-semibold tabular-nums">EGP {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t('cart.delivery', locale)}</span>
                    <span className="font-semibold tabular-nums">EGP {deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-brand-100 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">{t('cart.total', locale)}</span>
                    <span className="text-xl font-black text-gray-900 tabular-nums">EGP {total.toFixed(2)}</span>
                  </div>
                </div>

                {user?.role === 'customer' ? (
                  <>
                    <div className="border-t border-brand-50 pt-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-2.5">
                        {t('checkout.selectAddress', locale)} <span className="text-red-400">*</span>
                      </h3>

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
                        <div className="space-y-2.5">
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
                            className="w-full text-sm font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-2 border-dashed border-brand-100 hover:border-brand-200 rounded-2xl py-2.5 transition-colors"
                          >
                            + {t('checkout.addNewAddress', locale)}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-brand-50 pt-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-2.5">{t('checkout.paymentMethod', locale)}</h3>
                      <div className="space-y-2">
                        <label className={`flex items-center gap-3 cursor-pointer border-2 rounded-2xl px-3.5 py-3 transition-colors ${
                          paymentMethod === 'cod' ? 'border-brand-500 bg-brand-50/60' : 'border-gray-200 hover:border-brand-200'
                        }`}>
                          <input
                            type="radio" checked={paymentMethod === 'cod'}
                            onChange={() => setPaymentMethod('cod')}
                            className="accent-brand-600 w-4 h-4 shrink-0"
                          />
                          <span className="text-sm font-semibold text-gray-700">{t('checkout.cod', locale)}</span>
                        </label>
                        <label className={`flex items-center gap-3 cursor-pointer border-2 rounded-2xl px-3.5 py-3 transition-colors ${
                          paymentMethod === 'manual_transfer' ? 'border-brand-500 bg-brand-50/60' : 'border-gray-200 hover:border-brand-200'
                        }`}>
                          <input
                            type="radio" checked={paymentMethod === 'manual_transfer'}
                            onChange={() => setPaymentMethod('manual_transfer')}
                            className="accent-brand-600 w-4 h-4 shrink-0"
                          />
                          <span className="text-sm font-semibold text-gray-700">{t('checkout.instapay', locale)}</span>
                        </label>
                        <label className="flex items-center gap-3 opacity-40 cursor-not-allowed border-2 border-gray-100 rounded-2xl px-3.5 py-3">
                          <input type="radio" disabled className="accent-brand-600 w-4 h-4 shrink-0" />
                          <span className="text-sm font-semibold text-gray-500">{t('checkout.paymobSoon', locale)}</span>
                        </label>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
                    )}

                    <div>
                      <button
                        onClick={handleCheckout}
                        disabled={!canCheckout}
                        className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-black py-3.5 rounded-2xl text-sm transition-all duration-200"
                      >
                        {placing ? t('checkout.placingOrder', locale) : t('cart.checkout', locale)}
                      </button>
                      {!placing && !error && !addressId && (
                        <p className="text-xs text-center text-gray-400 mt-2">{t('checkout.selectAddressHint', locale)}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    {error && <p className="text-xs text-red-500 font-semibold mb-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                    <Link
                      href="/login?redirect=/cart"
                      className="block w-full text-center bg-accent-500 hover:bg-accent-600 active:scale-95 text-white font-black py-3.5 rounded-2xl text-sm transition-all duration-200"
                    >
                      {t('checkout.signInToCheckout', locale)}
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/products"
                className="block text-center text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors"
              >
                {t('checkout.continueShopping', locale)}
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
