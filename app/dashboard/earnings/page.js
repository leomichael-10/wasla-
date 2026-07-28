'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function RevenueBar({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div className="flex items-end gap-0.5 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
          <div
            className="w-full bg-purple-700 rounded-sm transition-all duration-300 hover:bg-purple-800"
            style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }}
          />
          {/* Tooltip on hover */}
          {d.revenue > 0 && (
            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10">
              {d.date}: EGP {d.revenue.toFixed(0)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function EarningsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const token = localStorage.getItem('wasla_token')
    fetch('/api/dashboard/earnings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(err => setError(err.message || 'Failed to load earnings.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-5 animate-pulse max-w-4xl">
      <div className="h-8 bg-gray-100 rounded w-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100" />)}
      </div>
      <div className="h-48 bg-white rounded-2xl border border-gray-100" />
    </div>
  )

  if (error) return (
    <div className="max-w-4xl">
      <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
    </div>
  )

  const fmt = n => `EGP ${Number(n).toFixed(2)}`

  return (
    <div className="max-w-4xl space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Earnings</h1>
        <span className="text-xs text-gray-400 font-medium">Delivered orders only</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="All Time"    value={fmt(data.totalRevenue)} />
        <StatCard label="This Month"  value={fmt(data.monthRevenue)} />
        <StatCard label="This Week"   value={fmt(data.weekRevenue)}  />
        <StatCard label="Today"       value={fmt(data.todayRevenue)} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-black text-gray-900 mb-4">Revenue — Last 30 Days</h2>
        <RevenueBar data={data.chartData} />
        <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
          <span>{data.chartData?.[0]?.date}</span>
          <span>{data.chartData?.[data.chartData.length - 1]?.date}</span>
        </div>
      </div>

      {/* Top products + variants */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-black text-gray-900 mb-3">Top Products</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium truncate max-w-40">{p.name}</span>
                  <span className="font-black text-gray-900 tabular-nums shrink-0">{p.units} units</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-black text-gray-900 mb-3">Top Variants</h2>
          {data.topVariants.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topVariants.map(f => (
                <div key={f.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium truncate max-w-40">{f.label}</span>
                  <span className="font-black text-gray-900 tabular-nums shrink-0">{f.units} units</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Delivered Orders</h2>
        </div>
        {data.orders.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No delivered orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f9f7ff] border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Order ID</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.orders.map(o => (
                  <tr key={o.id} className="hover:bg-[#f9f7ff]">
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(o.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">#{o.id}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{o.items?.length ?? 0}</td>
                    <td className="px-5 py-3 text-right font-black text-gray-900 tabular-nums">
                      EGP {Number(o.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
