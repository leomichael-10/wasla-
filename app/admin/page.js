'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

const SUB_STATUS = {
  pending:  'bg-yellow-100 text-yellow-700',
  active:   'bg-green-100  text-green-700',
  expired:  'bg-gray-100   text-gray-500',
  rejected: 'bg-red-100    text-red-600',
}

const TABS = ['Overview', 'Sellers', 'Users', 'Products', 'Categories', 'Commission']

export default function AdminPage() {
  const router = useRouter()

  const [activeTab,     setActiveTab]     = useState('Overview')
  const [sellers,       setSellers]       = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [stats,         setStats]         = useState(null)
  const [users,         setUsers]         = useState([])
  const [products,      setProducts]      = useState([])
  const [commission,    setCommission]    = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [ready,         setReady]         = useState(false)
  const [approving,     setApproving]     = useState(null)
  const [actioning,     setActioning]     = useState(null)
  const [banning,       setBanning]       = useState(null)
  const [toggling,      setToggling]      = useState(null)

  // Categories tab state
  const [categories,       setCategories]       = useState([])
  const [catForm,          setCatForm]          = useState({ name: '', icon: '' })
  const [catSaving,        setCatSaving]        = useState(false)
  const [editingCat,       setEditingCat]       = useState(null)   // { id, name, icon }
  const [deletingCat,      setDeletingCat]      = useState(null)
  const [subForms,         setSubForms]         = useState({})     // { [catId]: string }
  const [subSaving,        setSubSaving]        = useState(null)   // catId
  const [editingSub,       setEditingSub]       = useState(null)   // { id, name }
  const [deletingSub,      setDeletingSub]      = useState(null)
  const [catError,         setCatError]         = useState('')

  // Users tab filters
  const [userSearch, setUserSearch] = useState('')
  const [userRole,   setUserRole]   = useState('')

  // Products tab filters
  const [productSearch, setProductSearch] = useState('')
  const [productStatus, setProductStatus] = useState('')

  // Auth guard
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tobaki_user')
      if (!raw) { router.replace('/login'); return }
      const u = JSON.parse(raw)
      if (u.role !== 'admin') { router.replace('/'); return }
    } catch { router.replace('/login') }
    setReady(true)
  }, [router])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const token   = localStorage.getItem('tobaki_token')
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [selRes, subRes, stRes, usrRes, prdRes, comRes, catRes] = await Promise.all([
        fetch('/api/admin/sellers',       { headers }),
        fetch('/api/admin/subscriptions', { headers }),
        fetch('/api/admin/stats',         { headers }),
        fetch('/api/admin/users',         { headers }),
        fetch('/api/admin/products',      { headers }),
        fetch('/api/admin/commission',    { headers }),
        fetch('/api/admin/categories',    { headers }),
      ])
      const [selData, subData, stData, usrData, prdData, comData, catData] = await Promise.all([
        selRes.json(), subRes.json(), stRes.json(), usrRes.json(), prdRes.json(), comRes.json(), catRes.json(),
      ])
      if (!selRes.ok) throw new Error(selData.error)
      setSellers(      (selData.sellers       ?? []).sort((a,b) => a.businessName.localeCompare(b.businessName)))
      setSubscriptions( subData.subscriptions ?? [])
      setStats(         stData)
      setUsers(         usrData.users         ?? [])
      setProducts(      prdData.products      ?? [])
      setCommission(    comData)
      setCategories(    catData.categories    ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (ready) fetchAll() }, [ready, fetchAll])

  async function handleApproveSeller(sellerId) {
    setApproving(sellerId)
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/sellers/${sellerId}/approve`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, approvedByAdmin: true } : s))
    } catch (err) {
      setError(err.message || 'Failed to approve seller.')
    } finally {
      setApproving(null)
    }
  }

  async function handleSubAction(subId, action) {
    setActioning(subId)
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/subscriptions/${subId}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, ...data.subscription } : s))
      fetchAll()
    } catch (err) {
      setError(err.message || 'Failed to update subscription.')
    } finally {
      setActioning(null)
    }
  }

  async function handleBan(userId, isBanned) {
    setBanning(userId)
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isBanned: !isBanned }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !isBanned } : u))
    } catch (err) {
      setError(err.message || 'Failed to update user.')
    } finally {
      setBanning(null)
    }
  }

  async function handleToggleProduct(productId, isActive) {
    setToggling(productId)
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/products/${productId}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: !isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive: !isActive } : p))
    } catch (err) {
      setError(err.message || 'Failed to update product.')
    } finally {
      setToggling(null)
    }
  }

  async function handleSaveCategory(e) {
    e.preventDefault()
    setCatSaving(true); setCatError('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch('/api/admin/categories', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(catForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => [...prev, data.category].sort((a,b) => a.name.localeCompare(b.name)))
      setCatForm({ name: '', icon: '' })
    } catch (err) { setCatError(err.message) }
    finally { setCatSaving(false) }
  }

  async function handleUpdateCategory(e) {
    e.preventDefault()
    setCatSaving(true); setCatError('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/categories/${editingCat.id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: editingCat.name, icon: editingCat.icon }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => prev.map(c => c.id === editingCat.id ? { ...c, ...data.category } : c))
      setEditingCat(null)
    } catch (err) { setCatError(err.message) }
    finally { setCatSaving(false) }
  }

  async function handleDeleteCategory(id) {
    setDeletingCat(id); setCatError('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/categories/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err) { setCatError(err.message) }
    finally { setDeletingCat(null) }
  }

  async function handleAddSubcategory(catId) {
    const name = subForms[catId]?.trim()
    if (!name) return
    setSubSaving(catId); setCatError('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/categories/${catId}/subcategories`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => prev.map(c => c.id === catId
        ? { ...c, subCategories: [...(c.subCategories ?? []), data.subCategory].sort((a,b) => a.name.localeCompare(b.name)) }
        : c
      ))
      setSubForms(prev => ({ ...prev, [catId]: '' }))
    } catch (err) { setCatError(err.message) }
    finally { setSubSaving(null) }
  }

  async function handleUpdateSubcategory(e) {
    e.preventDefault()
    setCatSaving(true); setCatError('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/subcategories/${editingSub.id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: editingSub.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => prev.map(c => ({
        ...c,
        subCategories: (c.subCategories ?? []).map(s => s.id === editingSub.id ? { ...s, name: data.subCategory.name } : s),
      })))
      setEditingSub(null)
    } catch (err) { setCatError(err.message) }
    finally { setCatSaving(false) }
  }

  async function handleDeleteSubcategory(subId, catId) {
    setDeletingSub(subId); setCatError('')
    const token = localStorage.getItem('tobaki_token')
    try {
      const res  = await fetch(`/api/admin/subcategories/${subId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => prev.map(c => c.id === catId
        ? { ...c, subCategories: (c.subCategories ?? []).filter(s => s.id !== subId) }
        : c
      ))
    } catch (err) { setCatError(err.message) }
    finally { setDeletingSub(null) }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pending     = sellers.filter(s => !s.approvedByAdmin)
  const approved    = sellers.filter(s =>  s.approvedByAdmin)
  const pendingSubs = subscriptions.filter(s => s.status === 'pending')

  const filteredUsers = users.filter(u => {
    const matchRole   = !userRole   || u.role === userRole
    const matchSearch = !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase())
    return matchRole && matchSearch
  })

  const filteredProducts = products.filter(p => {
    const matchStatus = !productStatus || (productStatus === 'active' ? p.isActive : !p.isActive)
    const matchSearch = !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.brand ?? '').toLowerCase().includes(productSearch.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-0.5">Platform management and analytics</p>
          </div>
          <Link href="/browse" className="text-sm font-semibold text-teal-600 hover:underline">
            View as Customer
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab
                  ? 'bg-teal-400 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab}
              {tab === 'Sellers' && pendingSubs.length > 0 && (
                <span className="ml-1.5 bg-yellow-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingSubs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'Overview' && (
          <div className="space-y-8">
            {/* Platform stats */}
            {stats?.totals && (
              <section>
                <h2 className="text-base font-black text-gray-900 mb-4">Platform Stats</h2>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Users',    value: stats.totals.users,                       color: 'text-gray-900' },
                    { label: 'Total Sellers',  value: stats.totals.sellers,                     color: 'text-teal-700' },
                    { label: 'Total Products', value: stats.totals.products,                    color: 'text-blue-700' },
                    { label: 'Total Orders',   value: stats.totals.orders,                      color: 'text-yellow-700' },
                    { label: 'Revenue',        value: `AED ${stats.totals.revenue.toFixed(0)}`, color: 'text-green-700' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Analytics */}
            {stats && (
              <section className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-black text-gray-900 mb-1">Best Selling Disposable</h3>
                  {stats.bestDisposable ? (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-bold">{stats.bestDisposable.productName}</span>
                      {stats.bestDisposable.brand && <span className="text-gray-500"> · {stats.bestDisposable.brand}</span>}
                      <span className="ml-2 text-teal-600 font-semibold">{stats.bestDisposable.units} units sold</span>
                    </p>
                  ) : <p className="text-sm text-gray-400 mt-2">No data yet</p>}

                  <h3 className="font-black text-gray-900 mt-5 mb-1">Best Selling Liquid</h3>
                  {stats.bestLiquid ? (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-bold">{stats.bestLiquid.productName}</span>
                      {stats.bestLiquid.brand && <span className="text-gray-500"> · {stats.bestLiquid.brand}</span>}
                      <span className="ml-2 text-teal-600 font-semibold">{stats.bestLiquid.units} units sold</span>
                    </p>
                  ) : <p className="text-sm text-gray-400 mt-2">No data yet</p>}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-black text-gray-900 mb-3">Top Sellers by Revenue</h3>
                  {stats.topSellers?.length > 0 ? (
                    <div className="space-y-2">
                      {stats.topSellers.map((seller, i) => (
                        <div key={seller.sellerId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                            <span className="font-semibold text-gray-900">{seller.businessName}</span>
                            {seller.city && <span className="text-gray-400 text-xs">{seller.city}</span>}
                          </div>
                          <span className="font-black text-gray-900 tabular-nums">AED {seller.revenueAed.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">No delivered orders yet</p>}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── SELLERS TAB ── */}
        {activeTab === 'Sellers' && (
          <div className="space-y-8">
            {/* Pending subscriptions */}
            <section>
              <h2 className="text-base font-black text-gray-900 mb-4">
                Pending Subscriptions
                {pendingSubs.length > 0 && (
                  <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingSubs.length}</span>
                )}
              </h2>
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-24" />
              ) : pendingSubs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-gray-500 font-semibold text-sm">No pending subscriptions</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Business</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                          <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Amount</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Payment</th>
                          <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                          <th className="px-4 py-3.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pendingSubs.map(sub => (
                          <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 font-semibold text-gray-900">{sub.seller?.businessName ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.user?.email ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.city ?? '—'}</td>
                            <td className="px-4 py-4 text-right font-semibold tabular-nums">AED {Number(sub.priceAed).toFixed(0)}</td>
                            <td className="px-4 py-4 text-gray-600 capitalize">{sub.paymentMethod?.replace('_', ' ') ?? '—'}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${SUB_STATUS[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-gray-500 text-xs">
                              {new Date(sub.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSubAction(sub.id, 'activate')}
                                  disabled={actioning === sub.id}
                                  className="bg-teal-400 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                                >
                                  {actioning === sub.id ? '…' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleSubAction(sub.id, 'reject')}
                                  disabled={actioning === sub.id}
                                  className="border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                                >
                                  {actioning === sub.id ? '…' : 'Reject'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* All subscriptions */}
            <section>
              <h2 className="text-base font-black text-gray-900 mb-4">All Subscriptions</h2>
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-40" />
              ) : subscriptions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-sm text-gray-500 font-semibold">No subscriptions yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Business</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                          <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Amount AED</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Payment</th>
                          <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {subscriptions.map(sub => (
                          <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 font-semibold text-gray-900">{sub.seller?.businessName ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.user?.email ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.city ?? '—'}</td>
                            <td className="px-4 py-4 text-right font-semibold tabular-nums">{Number(sub.priceAed).toFixed(0)}</td>
                            <td className="px-4 py-4 text-gray-600 capitalize">{sub.paymentMethod?.replace('_', ' ') ?? '—'}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${SUB_STATUS[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-gray-500 text-xs">
                              {new Date(sub.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Pending seller approval */}
            <section>
              <h2 className="text-base font-black text-gray-900 mb-4">
                Pending Seller Approval
                {pending.length > 0 && (
                  <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
                )}
              </h2>
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-24" />
              ) : pending.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-sm text-gray-500 font-semibold">No sellers pending approval</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Business</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pending.map(seller => (
                        <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 font-semibold text-gray-900">{seller.businessName}</td>
                          <td className="px-4 py-4 text-gray-600">{seller.user?.email ?? '—'}</td>
                          <td className="px-4 py-4 text-gray-600">{seller.city ?? '—'}</td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleApproveSeller(seller.id)}
                              disabled={approving === seller.id}
                              className="bg-teal-400 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                            >
                              {approving === seller.id ? 'Approving…' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* All sellers */}
            <section>
              <h2 className="text-base font-black text-gray-900 mb-4">All Sellers ({sellers.length})</h2>
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-40" />
              ) : sellers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-sm text-gray-500 font-semibold">No seller accounts yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Business</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sellers.map(seller => (
                        <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 font-semibold text-gray-900">{seller.businessName}</td>
                          <td className="px-4 py-4 text-gray-600">{seller.user?.email ?? '—'}</td>
                          <td className="px-4 py-4 text-gray-600">{seller.city ?? '—'}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${seller.approvedByAdmin ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {seller.approvedByAdmin ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'Users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search by email…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-56"
              />
              <select
                value={userRole}
                onChange={e => setUserRole(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">All roles</option>
                <option value="customer">Customer</option>
                <option value="retailer">Retailer</option>
                <option value="wholesaler">Wholesaler</option>
                <option value="admin">Admin</option>
              </select>
              <span className="text-sm text-gray-500 self-center">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-40" />
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                <p className="text-sm text-gray-500 font-semibold">No users found</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">ID</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Role</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Orders</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Joined</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.isBanned ? 'opacity-60' : ''}`}>
                          <td className="px-5 py-3.5 text-gray-400 text-xs tabular-nums">#{u.id}</td>
                          <td className="px-4 py-3.5 text-gray-700 font-medium">{u.email}</td>
                          <td className="px-4 py-3.5 text-gray-600">
                            {u.customerProfile?.fullName || u.sellerProfile?.businessName || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                              u.role === 'admin'      ? 'bg-purple-100 text-purple-700' :
                              u.role === 'wholesaler' ? 'bg-blue-100 text-blue-700' :
                              u.role === 'retailer'   ? 'bg-teal-100 text-teal-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">{u.city ?? '—'}</td>
                          <td className="px-4 py-3.5 text-center text-gray-600">{u._count?.orders ?? 0}</td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs">
                            {new Date(u.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                              {u.isBanned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleBan(u.id, u.isBanned)}
                                disabled={banning === u.id}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  u.isBanned
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                }`}
                              >
                                {banning === u.id ? '…' : u.isBanned ? 'Unban' : 'Ban'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'Products' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search by name or brand…"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-64"
              />
              <select
                value={productStatus}
                onChange={e => setProductStatus(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <span className="text-sm text-gray-500 self-center">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-40" />
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                <p className="text-sm text-gray-500 font-semibold">No products found</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Product</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Brand</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Category</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Seller</th>
                        <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Price AED</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Listed</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map(p => {
                        const prices = p.variants?.map(v => Number(v.priceAed)) ?? []
                        const minP   = prices.length ? Math.min(...prices) : null
                        const maxP   = prices.length ? Math.max(...prices) : null
                        const priceStr = minP === null ? '—'
                          : minP === maxP ? `${minP.toFixed(0)}`
                          : `${minP.toFixed(0)}–${maxP.toFixed(0)}`
                        return (
                          <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.isActive ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-3.5">
                              <Link href={`/products/${p.id}`} className="font-semibold text-gray-900 hover:text-teal-600 transition-colors">
                                {p.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3.5 text-gray-600">{p.brand ?? '—'}</td>
                            <td className="px-4 py-3.5 text-gray-600 capitalize">{p.category?.name ?? '—'}</td>
                            <td className="px-4 py-3.5 text-gray-600">{p.seller?.businessName ?? '—'}</td>
                            <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{priceStr}</td>
                            <td className="px-4 py-3.5 text-gray-500 text-xs">
                              {new Date(p.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {p.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => handleToggleProduct(p.id, p.isActive)}
                                disabled={toggling === p.id}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
                                  p.isActive
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                                }`}
                              >
                                {toggling === p.id ? '…' : p.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CATEGORIES TAB ── */}
        {activeTab === 'Categories' && (
          <div className="space-y-6">
            {catError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {catError}
              </div>
            )}

            {/* Add category form */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-gray-900 mb-4">Add New Category</h2>
              <form onSubmit={handleSaveCategory} className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Name *</label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Disposables"
                    required
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-52"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Icon / Emoji</label>
                  <input
                    type="text"
                    value={catForm.icon}
                    onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}
                    placeholder="e.g. 💨"
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-32"
                  />
                </div>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="bg-teal-400 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
                >
                  {catSaving ? 'Saving…' : 'Add Category'}
                </button>
              </form>
            </section>

            {/* Category list */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-40" />
            ) : categories.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                <p className="text-sm text-gray-500 font-semibold">No categories yet — add one above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map(cat => (
                  <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    {/* Category header */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      {editingCat?.id === cat.id ? (
                        <form onSubmit={handleUpdateCategory} className="flex flex-wrap gap-2 items-center flex-1">
                          <input
                            type="text"
                            value={editingCat.name}
                            onChange={e => setEditingCat(v => ({ ...v, name: e.target.value }))}
                            required
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-44"
                          />
                          <input
                            type="text"
                            value={editingCat.icon ?? ''}
                            onChange={e => setEditingCat(v => ({ ...v, icon: e.target.value }))}
                            placeholder="Icon"
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-24"
                          />
                          <button type="submit" disabled={catSaving} className="bg-teal-400 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
                            {catSaving ? '…' : 'Save'}
                          </button>
                          <button type="button" onClick={() => setEditingCat(null)} className="text-gray-500 hover:text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 transition-colors">
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {cat.icon && <span className="text-2xl leading-none">{cat.icon}</span>}
                          <div>
                            <span className="font-black text-gray-900 text-base">{cat.name}</span>
                            <span className="ml-2 text-xs text-gray-400">{cat._count?.products ?? 0} products · {cat.subCategories?.length ?? 0} subcategories</span>
                          </div>
                        </div>
                      )}
                      {editingCat?.id !== cat.id && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setEditingCat({ id: cat.id, name: cat.name, icon: cat.icon ?? '' })}
                            className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            disabled={deletingCat === cat.id}
                            className="text-xs font-bold px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {deletingCat === cat.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Subcategories */}
                    <div className="pl-2 border-l-2 border-gray-100 space-y-2">
                      {(cat.subCategories ?? []).map(sub => (
                        <div key={sub.id} className="flex items-center justify-between gap-2">
                          {editingSub?.id === sub.id ? (
                            <form onSubmit={handleUpdateSubcategory} className="flex gap-2 items-center flex-1">
                              <input
                                type="text"
                                value={editingSub.name}
                                onChange={e => setEditingSub(v => ({ ...v, name: e.target.value }))}
                                required
                                className="border border-gray-200 rounded-xl px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-44"
                              />
                              <button type="submit" disabled={catSaving} className="bg-teal-400 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {catSaving ? '…' : 'Save'}
                              </button>
                              <button type="button" onClick={() => setEditingSub(null)} className="text-gray-500 text-xs font-bold px-3 py-1 rounded-full border border-gray-200">
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              <span className="text-sm text-gray-700 font-medium">· {sub.name}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setEditingSub({ id: sub.id, name: sub.name })}
                                  className="text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSubcategory(sub.id, cat.id)}
                                  disabled={deletingSub === sub.id}
                                  className="text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                >
                                  {deletingSub === sub.id ? '…' : 'Delete'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add subcategory inline */}
                      <div className="flex gap-2 items-center pt-1">
                        <input
                          type="text"
                          value={subForms[cat.id] ?? ''}
                          onChange={e => setSubForms(f => ({ ...f, [cat.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubcategory(cat.id))}
                          placeholder="New subcategory…"
                          className="border border-dashed border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-48 placeholder-gray-400"
                        />
                        <button
                          onClick={() => handleAddSubcategory(cat.id)}
                          disabled={subSaving === cat.id || !subForms[cat.id]?.trim()}
                          className="bg-gray-100 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-40 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                        >
                          {subSaving === cat.id ? '…' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COMMISSION TAB ── */}
        {activeTab === 'Commission' && (
          <div className="space-y-6">
            {/* Summary cards */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse h-24" />)}
              </div>
            ) : commission ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Commission',      value: `AED ${Number(commission.totalCommission ?? 0).toFixed(2)}`,  color: 'text-teal-700' },
                    { label: 'This Month',            value: `AED ${Number(commission.monthCommission ?? 0).toFixed(2)}`,  color: 'text-blue-700' },
                    { label: 'Commission Rate',       value: '10%',                                                        color: 'text-gray-900' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* By seller */}
                {commission.bySeller?.length > 0 && (
                  <section>
                    <h2 className="text-base font-black text-gray-900 mb-4">Commission by Seller</h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">#</th>
                              <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Seller</th>
                              <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                              <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Total Revenue</th>
                              <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Commission</th>
                              <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Orders</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {commission.bySeller.map((row, i) => (
                              <tr key={row.sellerId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3.5 text-gray-400 text-xs">{i + 1}</td>
                                <td className="px-4 py-3.5 font-semibold text-gray-900">{row.businessName}</td>
                                <td className="px-4 py-3.5 text-gray-600">{row.city ?? '—'}</td>
                                <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-gray-700">
                                  AED {Number(row.totalRevenue).toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-right font-black tabular-nums text-teal-700">
                                  AED {Number(row.totalCommission).toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-center text-gray-600">{row.orderCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {/* By month chart */}
                {commission.byMonth?.length > 0 && (
                  <section>
                    <h2 className="text-base font-black text-gray-900 mb-4">Monthly Commission (Last 12 Months)</h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-end gap-2 h-40">
                        {(() => {
                          const maxVal = Math.max(...commission.byMonth.map(m => Number(m.commission)), 1)
                          return commission.byMonth.map(m => {
                            const pct = (Number(m.commission) / maxVal) * 100
                            return (
                              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                <span className="text-[10px] font-bold text-teal-700 tabular-nums">
                                  {Number(m.commission) > 0 ? Number(m.commission).toFixed(0) : ''}
                                </span>
                                <div
                                  className="w-full bg-teal-400 rounded-t-md transition-all"
                                  style={{ height: `${Math.max(pct, 2)}%` }}
                                />
                                <span className="text-[9px] text-gray-400 font-semibold truncate w-full text-center">{m.month}</span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                <p className="text-sm text-gray-500 font-semibold">No commission data yet</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
