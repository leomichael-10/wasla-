'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  accepted:  'bg-blue-100   text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100  text-green-700',
  cancelled: 'bg-red-100    text-red-700',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, icon, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-900">{value}</p>
        </div>
        <div className={`${bg} w-11 h-11 rounded-xl flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// Small SVG icons for stat cards
const IconBox = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-purple-700">
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
)
const IconClipboard = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
  </svg>
)
const IconClock = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-yellow-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)
const IconBanknote = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
  </svg>
)

const QUICK_LINKS = [
  {
    href: '/dashboard/products',
    label: 'My Products',
    bg: 'bg-purple-50',
    border: 'border-purple-200 hover:border-purple-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-purple-600">
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/orders',
    label: 'My Orders',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200 hover:border-yellow-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-yellow-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/products/add',
    label: 'Add Product',
    bg: 'bg-purple-50',
    border: 'border-purple-200 hover:border-purple-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-purple-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
]

export default function DashboardOverviewPage() {
  const [products,     setProducts]     = useState([])
  const [orders,       setOrders]       = useState([])
  const [subscription, setSubscription] = useState(undefined) // undefined = loading
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  useEffect(() => {
    const token   = localStorage.getItem('wasla_token')
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch('/api/seller/products', { headers }).then(r => r.json()),
      fetch('/api/orders',          { headers }).then(r => r.json()),
      fetch('/api/subscriptions',   { headers }).then(r => r.json()),
    ])
      .then(([pData, oData, sData]) => {
        setProducts(pData.products ?? [])
        setOrders(oData.orders     ?? [])
        setSubscription(sData.subscription ?? null)
      })
      .catch(() => setError('Failed to load dashboard data. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const revenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.totalAed), 0)

  const lowStockCount = products.reduce((count, p) =>
    count + (p.variants ?? []).filter(v => v.stockQty < 5).length, 0
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Overview</h1>
        <Link
          href="/dashboard/products/add"
          className="bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          + Add Product
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-red-800">
            Low stock alert: {lowStockCount} product variant{lowStockCount !== 1 ? 's are' : ' is'} running low (below 5 units).
          </p>
          <Link href="/dashboard/products" className="shrink-0 text-xs font-bold text-red-600 hover:underline">
            Manage stock
          </Link>
        </div>
      )}

      {/* Subscription banner */}
      {subscription !== undefined && (() => {
        if (!subscription) {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-yellow-800">
                No active subscription. Contact support or register again to subscribe.
              </p>
            </div>
          )
        }
        if (subscription.status === 'pending') {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-yellow-800">
                Your subscription payment of AED 199 is being verified. Account will be activated within 24 hours.
              </p>
            </div>
          )
        }
        if (subscription.status === 'active') {
          const expiry = subscription.endDate
            ? new Date(subscription.endDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })
            : null
          return (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <p className="text-sm font-semibold text-green-800">
                Subscription active{expiry ? ` — Expires: ${expiry}` : ''}
              </p>
            </div>
          )
        }
        if (subscription.status === 'expired') {
          return (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-red-800">
                Your subscription has expired. Please contact support to renew.
              </p>
            </div>
          )
        }
        return null
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Products"     value={products.length}             icon={IconBox}      bg="bg-purple-50"   />
        <StatCard label="Total Orders" value={orders.length}               icon={IconClipboard} bg="bg-blue-50"   />
        <StatCard label="Pending"      value={pendingCount}                icon={IconClock}    bg="bg-yellow-50" />
        <StatCard label="Revenue"      value={`AED ${revenue.toFixed(0)}`} icon={IconBanknote} bg="bg-green-50"  />
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {QUICK_LINKS.map(a => (
          <Link
            key={a.href}
            href={a.href}
            className={`bg-white rounded-2xl border-2 ${a.border} p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200`}
          >
            <div className={`${a.bg} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}>
              {a.icon}
            </div>
            <div>
              <p className="font-bold text-gray-900">{a.label}</p>
              {a.href === '/dashboard/products' && (
                <p className="text-sm text-gray-500 mt-0.5">{products.length} listed</p>
              )}
              {a.href === '/dashboard/orders' && (
                <p className="text-sm text-gray-500 mt-0.5">{pendingCount} pending</p>
              )}
              {a.href === '/dashboard/products/add' && (
                <p className="text-sm text-gray-500 mt-0.5">List a new product</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-gray-900">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-sm text-purple-700 font-semibold hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Order #{order.id}</p>
                  <p className="text-xs text-gray-400">
                    {order.items?.length ?? 0} item{order.items?.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-black text-gray-900 tabular-nums">
                    AED {Number(order.totalAed).toFixed(0)}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <p className="text-gray-500 font-medium">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">Orders will appear here once customers start buying.</p>
        </div>
      )}

    </div>
  )
}
