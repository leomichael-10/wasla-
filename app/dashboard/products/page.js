'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function DashboardProductsPage() {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [deleting, setDeleting] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch('/api/seller/products', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProducts(data.products ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  async function handleDelete(productId, productName) {
    if (!confirm(`Deactivate "${productName}"? It will no longer appear in the store.`)) return
    setDeleting(productId)
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/products/${productId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchProducts()
    } catch (err) {
      setError(err.message || 'Failed to deactivate product.')
    } finally {
      setDeleting(null)
    }
  }

  // Count low-stock variants per product
  function lowStockCount(p) {
    return (p.variants ?? []).filter(v => v.stockQty < 5).length
  }

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Products</h1>
          {!loading && <p className="text-sm text-gray-500 mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>}
        </div>
        <Link href="/dashboard/products/add"
          className="bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          + Add Product
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="px-5 py-4 border-b border-gray-50 flex gap-4">
              <div className="h-4 bg-gray-100 rounded flex-1" />
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <p className="text-gray-500 font-semibold">No products listed yet</p>
          <Link href="/dashboard/products/add"
            className="inline-block mt-4 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
            Add your first product
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f9f7ff]">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Brand</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Variants</th>
                  <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => {
                  const low  = lowStockCount(p)
                  const minStock = Math.min(...(p.variants ?? []).map(v => v.stockQty), Infinity)
                  return (
                    <tr key={p.id} className="hover:bg-[#f9f7ff] transition-colors">
                      <td className="px-5 py-4 font-semibold text-gray-900">{p.name}</td>
                      <td className="px-4 py-4 text-gray-600">{p.brand ?? '—'}</td>
                      <td className="px-4 py-4 text-gray-600">{p.category?.name ?? '—'}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          {p._count?.variants ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {low > 0 ? (
                          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {low} low
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-semibold">
                            {minStock === Infinity ? '—' : `${minStock}+`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/dashboard/products/${p.id}/stock`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                            Stock
                          </Link>
                          <Link href={`/dashboard/products/${p.id}/edit`}
                            className="text-xs font-semibold text-purple-700 hover:text-purple-800 transition-colors">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={!p.isActive || deleting === p.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            {deleting === p.id ? 'Deactivating…' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {products.map(p => {
              const low = lowStockCount(p)
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 leading-tight">{p.name}</p>
                      {p.brand && <p className="text-sm text-purple-700 font-semibold mt-0.5">{p.brand}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {p.category?.name} · {p._count?.variants ?? 0} variant{p._count?.variants !== 1 ? 's' : ''}
                      </p>
                      {low > 0 && <p className="text-xs font-bold text-red-500 mt-1">{low} variant{low !== 1 ? 's' : ''} low stock</p>}
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <Link href={`/dashboard/products/${p.id}/stock`} className="text-xs font-semibold text-blue-600">Manage Stock</Link>
                    <Link href={`/dashboard/products/${p.id}/edit`}  className="text-xs font-semibold text-purple-700">Edit</Link>
                    {p.isActive && (
                      <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id}
                        className="text-xs font-semibold text-red-500 disabled:opacity-40">
                        {deleting === p.id ? 'Deactivating…' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
