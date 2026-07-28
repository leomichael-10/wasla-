'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const POLL_MS = 20_000

// Short two-tone chime via Web Audio — no asset file needed.
function playNewOrderChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[880, 660].forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)
      const start = now + i * 0.15
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2)
      osc.start(start)
      osc.stop(start + 0.22)
    })
  } catch { /* ignore — audio isn't essential */ }
}

const STATUS_STYLES = {
  PLACED:           'bg-yellow-100 text-yellow-700',
  SHOP_CONFIRMED:   'bg-blue-100   text-blue-700',
  PREPARING:        'bg-orange-100 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED:        'bg-green-100  text-green-700',
  CANCELLED:        'bg-red-100    text-red-700',
}

// Which statuses can a seller transition an order to from the current status
const NEXT_STATUS = {
  PLACED:           ['SHOP_CONFIRMED', 'CANCELLED'],
  SHOP_CONFIRMED:   ['PREPARING', 'CANCELLED'],
  PREPARING:        ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED:        [],
  CANCELLED:        [],
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status?.replaceAll('_', ' ')}
    </span>
  )
}

export default function DashboardOrdersPage() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [updating, setUpdating] = useState(null) // order id being updated
  const [hasNew,   setHasNew]   = useState(false)
  const knownIds = useRef(new Set())
  const firstLoad = useRef(true)

  const fetchOrders = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const fresh = data.orders ?? []

      if (!firstLoad.current) {
        const newOnes = fresh.filter(o => o.status === 'PLACED' && !knownIds.current.has(o.id))
        if (newOnes.length > 0) {
          setHasNew(true)
          playNewOrderChime()
        }
      }
      knownIds.current = new Set(fresh.map(o => o.id))
      firstLoad.current = false

      setOrders(fresh)
    } catch (err) {
      setError(err.message || 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(() => fetchOrders({ silent: true }), POLL_MS)
    return () => clearInterval(interval)
  }, [fetchOrders])

  async function handleStatusChange(orderId, newStatus) {
    setUpdating(orderId)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/orders/${orderId}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Update locally without re-fetching
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      )
    } catch (err) {
      setError(err.message || 'Failed to update order status.')
    } finally {
      setUpdating(null)
    }
  }

  const counts = {
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'PLACED').length,
    active:   orders.filter(o => ['SHOP_CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.status)).length,
    done:     orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status)).length,
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          My Orders
          {hasNew && (
            <button
              onClick={() => setHasNew(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-500 text-white px-2.5 py-1 rounded-full animate-pulse"
            >
              <span className="w-1.5 h-1.5 bg-white rounded-full" /> New order
            </button>
          )}
        </h1>
        {!loading && (
          <div className="flex gap-4 mt-2 flex-wrap">
            {[
              { label: 'Total',   value: counts.total,   color: 'text-gray-600'   },
              { label: 'Pending', value: counts.pending,  color: 'text-yellow-600' },
              { label: 'Active',  value: counts.active,   color: 'text-blue-600'   },
              { label: 'Done',    value: counts.done,     color: 'text-gray-400'   },
            ].map(s => (
              <span key={s.label} className="text-sm font-semibold text-gray-500">
                {s.label}: <span className={`font-black ${s.color}`}>{s.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <p className="text-gray-500 font-semibold">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">Orders will appear here once customers buy from your shop.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const nextOptions = NEXT_STATUS[order.status] ?? []
            const isUpdating  = updating === order.id

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Order header */}
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-900">Order #{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-black text-gray-900 text-base tabular-nums">
                      EGP {Number(order.total).toFixed(2)}
                    </span>
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('en-AE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Order body */}
                <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">

                  {/* Items */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Items</p>
                    <div className="space-y-1">
                      {order.items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                          <span className="text-gray-700 truncate">
                            {item.productVariant?.product?.name ?? 'Product'}
                            {item.productVariant?.label ? ` · ${item.productVariant.label}` : ''}
                          </span>
                          <span className="shrink-0 text-gray-500 font-medium">
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery info */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Delivery</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {order.deliveryAddress}
                    </p>
                    {order.paymentMethod && (
                      <p className="text-xs text-gray-400 mt-1 capitalize">
                        Payment: {order.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status actions */}
                {nextOptions.length > 0 && (
                  <div className="px-5 py-3 bg-[#f9f7ff] border-t border-gray-100 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Update status:
                    </span>
                    {nextOptions.map(next => (
                      <button
                        key={next}
                        onClick={() => handleStatusChange(order.id, next)}
                        disabled={isUpdating}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          next === 'CANCELLED'
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                        }`}
                      >
                        {isUpdating ? '…' : `→ ${next.replaceAll('_', ' ')}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Terminal state notice */}
                {nextOptions.length === 0 && (
                  <div className="px-5 py-3 bg-[#f9f7ff] border-t border-gray-100">
                    <span className="text-xs text-gray-400 font-medium">
                      {order.status === 'DELIVERED' ? 'Order completed' : 'Order cancelled'}
                    </span>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
