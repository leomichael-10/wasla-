'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STATUS_BADGE = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
}

export default function DashboardProductsPage() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [removing, setRemoving] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/seller/retailer-products', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function handleRemove(id, name) {
    if (!confirm(`Remove "${name}" from your store?`)) return
    setRemoving(id)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/seller/retailer-products/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to remove.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Products</h1>
          {!loading && <p className="text-sm text-gray-500 mt-0.5">{items.length} product{items.length !== 1 ? 's' : ''}</p>}
        </div>
        <Link href="/dashboard/catalog"
          className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          + Browse Catalog
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="px-5 py-4 border-b border-gray-50 flex gap-4">
                <div className="h-4 bg-gray-100 rounded flex-1" />
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500 font-semibold">No products selected yet</p>
            <Link href="/dashboard/catalog"
              className="inline-block mt-4 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
              Browse the catalog
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Your Price</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Note</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-[#FBF6EF] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {item.masterProduct?.images?.[0] ? (
                        <img src={item.masterProduct.images[0]} alt={item.masterProduct.name}
                          className="w-9 h-9 rounded-lg object-cover bg-gray-50 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                          <span className="text-brand-400 font-black text-sm">{(item.masterProduct?.name ?? 'P')[0]}</span>
                        </div>
                      )}
                      <span className="font-semibold text-gray-900">{item.masterProduct?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{item.masterProduct?.category?.name ?? '—'}</td>
                  <td className="px-4 py-4 text-right font-semibold tabular-nums">EGP {Number(item.price).toFixed(0)}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{item.stockQty}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-gray-400 max-w-35 truncate">
                    {item.adminNote ?? '—'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleRemove(item.id, item.masterProduct?.name)}
                      disabled={removing === item.id}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                    >
                      {removing === item.id ? '…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
