'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const MOVEMENT_TYPES = [
  { value: 'add',    label: 'Add Stock'     },
  { value: 'remove', label: 'Remove Stock'  },
  { value: 'set',    label: 'Set Stock'     },
]

export default function ManageStockPage() {
  const { id } = useParams()
  const [product,  setProduct]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [rows,     setRows]     = useState([]) // { variantId, quantity, movementType }

  useEffect(() => {
    const token = localStorage.getItem('wasla_token')
    fetch(`/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (!data.product) { setError('Product not found'); return }
        setProduct(data.product)
        setRows(
          data.product.variants.map(v => ({
            variantId:    String(v.id),
            quantity:     '',
            movementType: 'add',
          }))
        )
      })
      .catch(() => setError('Failed to load product.'))
      .finally(() => setLoading(false))
  }, [id])

  function updateRow(index, field, value) {
    setRows(prev => { const n = [...prev]; n[index] = { ...n[index], [field]: value }; return n })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const token   = localStorage.getItem('wasla_token')
    const payload = rows
      .filter(r => r.quantity !== '' && Number(r.quantity) >= 0)
      .map(r => ({ variantId: parseInt(r.variantId, 10), quantity: parseInt(r.quantity, 10), movementType: r.movementType }))

    if (payload.length === 0) {
      setError('Enter at least one quantity to update.')
      setSaving(false)
      return
    }

    try {
      const res  = await fetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:   JSON.stringify({ variants: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProduct(data.product)
      setRows(
        data.product.variants.map(v => ({
          variantId:    String(v.id),
          quantity:     '',
          movementType: 'add',
        }))
      )
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update stock.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-3xl animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="h-64 bg-white rounded-2xl border border-gray-100" />
    </div>
  )

  if (!product) return (
    <div className="max-w-3xl">
      <p className="text-red-500 font-semibold">{error || 'Product not found.'}</p>
      <Link href="/dashboard/products" className="mt-3 inline-block text-purple-700 font-bold text-sm hover:underline">
        Back to products
      </Link>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/products" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Manage Stock</h1>
          <p className="text-sm text-gray-500">{product.name}</p>
        </div>
      </div>

      {error   && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl px-4 py-3">Stock updated successfully.</div>}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f9f7ff]">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Label</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Current Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {product.variants.map((v, i) => {
                  const row = rows[i] ?? {}
                  return (
                    <tr key={v.id} className={v.stockQty < 5 ? 'bg-red-50' : 'hover:bg-[#f9f7ff]'}>
                      <td className="px-5 py-3 font-semibold text-gray-900">
                        {v.label ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-black text-sm tabular-nums ${v.stockQty < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                          {v.stockQty}
                          {v.stockQty < 5 && <span className="ml-1 text-[10px] font-bold text-red-400">Low</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.movementType}
                          onChange={e => updateRow(i, 'movementType', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {MOVEMENT_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={row.quantity}
                          onChange={e => updateRow(i, 'quantity', e.target.value)}
                          placeholder="0"
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="bg-purple-700 hover:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Update Stock'}
          </button>
          <Link href="/dashboard/products" className="text-sm font-semibold text-gray-500 hover:text-gray-700">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
