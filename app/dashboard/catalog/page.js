'use client'
import { useState, useEffect, useCallback } from 'react'

const STATUS_BADGE = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
}

export default function CatalogPage() {
  const [catalog,    setCatalog]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [selecting,  setSelecting]  = useState(null)
  const [form,       setForm]       = useState({})     // { [masterProductId]: { price, stock } }
  const [openForm,   setOpenForm]   = useState(null)   // masterProductId with form open
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  // Product request state
  const [reqName,    setReqName]    = useState('')
  const [reqNotes,   setReqNotes]   = useState('')
  const [reqSaving,  setReqSaving]  = useState(false)
  const [reqSuccess, setReqSuccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch('/api/seller/catalog', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCatalog(data.catalog ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load catalog.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSelect(masterProductId) {
    const f = form[masterProductId] ?? {}
    if (!f.price) { setError('Enter your price before selecting.'); return }
    setSelecting(masterProductId); setError(''); setSuccess('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch('/api/seller/retailer-products', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ masterProductId, priceAed: f.price, stockQty: f.stock || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Product submitted for approval!')
      setOpenForm(null)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to submit.')
    } finally {
      setSelecting(null)
    }
  }

  async function handleRequest(e) {
    e.preventDefault()
    setReqSaving(true); setError('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch('/api/seller/product-requests', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: reqName, notes: reqNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReqSuccess(true); setReqName(''); setReqNotes('')
    } catch (err) {
      setError(err.message || 'Failed to submit request.')
    } finally {
      setReqSaving(false)
    }
  }

  const filtered = catalog.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Product Catalog</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select products from the catalog to add to your store. Each selection goes to admin for approval.</p>
      </div>

      {error   && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3">{success}</div>}

      {/* Search */}
      <input
        type="text"
        placeholder="Search catalog…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      />

      {/* Catalog grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <p className="text-gray-400 font-semibold">No products found in the catalog yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const isOpen = openForm === p.id
            const f      = form[p.id] ?? {}
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Image */}
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-purple-50 flex items-center justify-center">
                    <span className="text-3xl font-black text-purple-200">{p.name[0]}</span>
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-bold text-gray-900 leading-tight">{p.name}</p>
                    {p.myStatus && (
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[p.myStatus]}`}>
                        {p.myStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-600 font-semibold mb-1">{p.category?.name}</p>
                  {(p.priceMin != null || p.priceMax != null) && (
                    <p className="text-xs text-gray-400 mb-2">
                      Suggested: AED {p.priceMin != null ? Number(p.priceMin).toFixed(0) : '?'}
                      {p.priceMax != null && p.priceMax !== p.priceMin ? `–${Number(p.priceMax).toFixed(0)}` : ''}
                    </p>
                  )}

                  <div className="mt-auto">
                    {p.myStatus ? (
                      <p className="text-xs text-gray-400 font-semibold text-center py-1">
                        {p.myStatus === 'APPROVED' ? 'Live in your store' : p.myStatus === 'REJECTED' ? 'Rejected by admin' : 'Awaiting approval'}
                      </p>
                    ) : isOpen ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          placeholder="Your price (AED)"
                          value={f.price ?? ''}
                          onChange={e => setForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <input
                          type="number"
                          placeholder="Stock quantity"
                          value={f.stock ?? ''}
                          onChange={e => setForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], stock: e.target.value } }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSelect(p.id)}
                            disabled={selecting === p.id}
                            className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                          >
                            {selecting === p.id ? 'Submitting…' : 'Submit for Approval'}
                          </button>
                          <button
                            onClick={() => setOpenForm(null)}
                            className="px-3 border border-gray-200 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setOpenForm(p.id)}
                        className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold py-2 rounded-xl transition-colors"
                      >
                        + Add to My Store
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Request a product */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-900 mb-1">Can&apos;t find a product?</h2>
        <p className="text-sm text-gray-500 mb-4">Submit a request and the admin will review it for the catalog.</p>
        {reqSuccess ? (
          <p className="text-sm text-green-700 font-semibold">Request submitted! Admin will review it.</p>
        ) : (
          <form onSubmit={handleRequest} className="space-y-3">
            <input
              type="text"
              placeholder="Product name *"
              value={reqName}
              onChange={e => setReqName(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <textarea
              placeholder="Notes (brand, specs, why you need it…)"
              value={reqNotes}
              onChange={e => setReqNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            <button
              type="submit"
              disabled={reqSaving}
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              {reqSaving ? 'Sending…' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
