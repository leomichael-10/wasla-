'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { buildWaMeUrl } from '../../../lib/notifications'

export default function OrderConfirmationPage() {
  const [orders,     setOrders]     = useState([])
  const [uploading,  setUploading]  = useState(null)
  const [uploaded,   setUploaded]   = useState({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('wasla_last_orders')
      if (raw) setOrders(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  async function handleReceiptUpload(orderId, file) {
    if (!file) return
    setUploading(orderId)
    const token = localStorage.getItem('wasla_token')
    try {
      const fd = new FormData()
      fd.append('receipt', file)
      const res  = await fetch(`/api/orders/${orderId}/receipt`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUploaded(prev => ({ ...prev, [orderId]: true }))
    } catch { /* surfaced via disabled state only, keep this lightweight */ } finally {
      setUploading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Success heading */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Order Placed Successfully</h1>
          <p className="text-gray-500 text-sm mt-2">
            Your order has been received and will be confirmed by the seller shortly.
          </p>
        </div>

        {/* Order details */}
        {orders.length > 0 ? (
          <div className="space-y-4 mb-8">
            {orders.map((order, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <span className="font-black text-gray-900">Order #{order.id}</span>
                  <span className="font-black text-gray-900 tabular-nums">EGP {Number(order.total).toFixed(2)}</span>
                </div>
                <div className="px-5 py-4 space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.productVariant?.product?.name ?? 'Product'}
                        {item.productVariant?.label ? ` · ${item.productVariant.label}` : ''}
                      </span>
                      <span className="text-gray-500">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-[#FBF6EF] border-t border-gray-100 grid grid-cols-3 text-xs text-gray-500 gap-2">
                  <span>Payment: {order.paymentMethod ?? 'cod'}</span>
                  <span className="text-center text-green-600 font-semibold">Status: Placed</span>
                  <span className="text-right">Delivery: {order.promisedEta ? new Date(order.promisedEta).toLocaleString('en-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'TBD'}</span>
                </div>

                {(() => {
                  const waUrl = buildWaMeUrl(order, order.seller)
                  return (
                    <div className="px-5 py-3 border-t border-gray-100">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-xl transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2Zm0 18.11h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.7-.8-.23-.08-.39-.12-.56.13-.17.25-.64.8-.78.96-.14.17-.29.18-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.24-.4.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29Z" />
                          </svg>
                          إبلاغ المتجر عبر واتساب
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400">لا يمكن إبلاغ المتجر — لا يوجد رقم واتساب مسجل.</p>
                      )}
                    </div>
                  )
                })()}

                {order.paymentMethod === 'manual_transfer' && (
                  <div className="px-5 py-4 border-t border-gray-100">
                    {uploaded[order.id] ? (
                      <p className="text-xs text-green-600 font-semibold">Receipt uploaded — awaiting admin confirmation.</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 mb-2">
                          Send payment via InstaPay or Vodafone Cash, then upload your receipt to confirm this order.
                        </p>
                        <label className={`inline-block cursor-pointer bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors ${uploading === order.id ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploading === order.id ? 'Uploading…' : 'Upload Receipt'}
                          <input
                            type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                            onChange={e => handleReceiptUpload(order.id, e.target.files?.[0])}
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-8">
            <p className="text-gray-500 font-semibold">Your order has been placed.</p>
            <p className="text-sm text-gray-400 mt-1">Check My Orders for details.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 justify-center">
          <Link
            href="/orders"
            className="bg-brand-700 hover:bg-brand-800 text-white font-black px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Track My Orders
          </Link>
          <Link
            href="/products"
            className="text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
