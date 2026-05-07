'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'

export default function OrderConfirmationPage() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tobaki_last_orders')
      if (raw) setOrders(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
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
                  <span className="font-black text-gray-900 tabular-nums">AED {Number(order.totalAed).toFixed(2)}</span>
                </div>
                <div className="px-5 py-4 space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.productVariant?.product?.name ?? 'Product'}
                        {item.productVariant?.flavor ? ` · ${item.productVariant.flavor}` : ''}
                      </span>
                      <span className="text-gray-500">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-3 text-xs text-gray-500 gap-2">
                  <span>Payment: {order.paymentMethod ?? 'Cash'}</span>
                  <span className="text-center text-green-600 font-semibold">Status: Pending</span>
                  <span className="text-right">Delivery: 2–4 hrs</span>
                </div>
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
            className="bg-teal-400 hover:bg-teal-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-colors"
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
