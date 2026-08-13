'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import MasterProductForm from '../../components/MasterProductForm'
import WalletsTab from '../../components/admin/WalletsTab'

const SUB_STATUS = {
  pending:  'bg-yellow-100 text-yellow-700',
  active:   'bg-green-100  text-green-700',
  expired:  'bg-gray-100   text-gray-500',
  rejected: 'bg-red-100    text-red-600',
}

const TABS = ['Overview', 'Sellers', 'Users', 'Products', 'Categories', 'Commission', 'Wallets', 'Traffic', 'Catalog', 'Approvals']

export default function AdminPage() {
  const router = useRouter()

  const [activeTab,     setActiveTab]     = useState('Overview')
  const [sellers,       setSellers]       = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [stats,         setStats]         = useState(null)
  const [users,         setUsers]         = useState([])
  const [products,      setProducts]      = useState([])
  const [commission,    setCommission]    = useState(null)
  const [commissionRateInfo, setCommissionRateInfo] = useState(null) // { rate, history }
  const [rateInput,  setRateInput]  = useState('')
  const [rateSaving, setRateSaving] = useState(false)
  const [rateError,  setRateError]  = useState('')
  const [traffic,       setTraffic]       = useState(null)
  const [masterProducts,  setMasterProducts]  = useState([])
  const [pendingApprovals,setPendingApprovals] = useState([])
  const [productRequests, setProductRequests]  = useState([])

  // SKU catalogue
  const [showMasterForm,  setShowMasterForm]   = useState(false)
  const [editingMaster,   setEditingMaster]    = useState(null)
  const [actioningRP,     setActioningRP]      = useState(null)
  const [noteRP,          setNoteRP]           = useState({})
  const [subActioning,    setSubActioning]     = useState(null)
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
      const raw = localStorage.getItem('wasla_user')
      if (!raw) { router.replace('/login'); return }
      const u = JSON.parse(raw)
      if (u.role !== 'admin') { router.replace('/'); return }
    } catch { router.replace('/login') }
    setReady(true)
  }, [router])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const token   = localStorage.getItem('wasla_token')
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [selRes, subRes, stRes, usrRes, prdRes, comRes, rateRes, catRes, trafRes, mpRes, rpRes, prRes] = await Promise.all([
        fetch('/api/admin/sellers',          { headers }),
        fetch('/api/admin/subscriptions',    { headers }),
        fetch('/api/admin/stats',            { headers }),
        fetch('/api/admin/users',            { headers }),
        fetch('/api/admin/products',         { headers }),
        fetch('/api/admin/commission',       { headers }),
        fetch('/api/admin/commission-rate',  { headers }),
        fetch('/api/admin/categories',       { headers }),
        fetch('/api/admin/traffic',          { headers }),
        fetch('/api/admin/master-products',  { headers }),
        fetch('/api/admin/retailer-products?status=PENDING', { headers }),
        fetch('/api/admin/product-requests', { headers }),
      ])
      const [selData, subData, stData, usrData, prdData, comData, rateData, catData, trafData, mpData, rpData, prData] = await Promise.all([
        selRes.json(), subRes.json(), stRes.json(), usrRes.json(), prdRes.json(), comRes.json(), rateRes.json(), catRes.json(), trafRes.json(), mpRes.json(), rpRes.json(), prRes.json(),
      ])
      if (!selRes.ok) throw new Error(selData.error)
      setSellers(       (selData.sellers       ?? []).sort((a,b) => a.businessName.localeCompare(b.businessName)))
      setSubscriptions(  subData.subscriptions ?? [])
      setStats(          stData)
      setUsers(          usrData.users         ?? [])
      setProducts(       prdData.products      ?? [])
      setCommission(     comData)
      if (rateRes.ok) setCommissionRateInfo(rateData)
      setCategories(     catData.categories    ?? [])
      if (trafRes.ok) setTraffic(trafData)
      if (mpRes.ok)   setMasterProducts(  mpData.products  ?? [])
      if (rpRes.ok)   setPendingApprovals(rpData.items     ?? [])
      if (prRes.ok)   setProductRequests( prData.requests  ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (ready) fetchAll() }, [ready, fetchAll])

  async function handleApproveSeller(sellerId) {
    setApproving(sellerId)
    const token = localStorage.getItem('wasla_token')
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

  async function handleSetCommissionRate(e) {
    e.preventDefault()
    setRateError('')
    const ratePercent = parseFloat(rateInput)
    if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      setRateError('Enter a number between 0 and 100.')
      return
    }
    setRateSaving(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/admin/commission-rate', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ratePercent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRateInput('')
      const rateRes  = await fetch('/api/admin/commission-rate', { headers: { Authorization: `Bearer ${token}` } })
      const rateData = await rateRes.json()
      if (rateRes.ok) setCommissionRateInfo(rateData)
    } catch (err) {
      setRateError(err.message || 'Failed to update commission rate.')
    } finally {
      setRateSaving(false)
    }
  }

  async function handleSubAction(subId, action) {
    setActioning(subId)
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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
    const token = localStorage.getItem('wasla_token')
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

  async function handleSubscription(sellerId, action) {
    setSubActioning(sellerId)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/admin/sellers/${sellerId}/subscription`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, subscriptionStatus: data.seller.subscriptionStatus } : s))
    } catch (err) {
      setError(err.message || 'Failed to update subscription.')
    } finally {
      setSubActioning(null)
    }
  }

  async function handleToggleMaster(id, isActive) {
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/admin/master-products/${id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: !isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMasterProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !isActive } : p))
    } catch (err) {
      setError(err.message || 'Failed to update.')
    }
  }

  async function handleRetailerProductAction(id, action) {
    setActioningRP(id)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/admin/retailer-products/${id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, adminNote: noteRP[id] ?? null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPendingApprovals(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to action.')
    } finally {
      setActioningRP(null)
    }
  }

  async function handleMarkRequestReviewed(id) {
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/admin/product-requests/${id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setProductRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REVIEWED' } : r))
    } catch { /* ignore */ }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#FBF6EF] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
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
      (p.nameEn ?? '').toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.brand ?? '').toLowerCase().includes(productSearch.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-0.5">Platform management and analytics</p>
          </div>
          <Link href="/browse" className="text-sm font-semibold text-brand-700 hover:underline">
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
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-[#FBF6EF]'
              }`}
            >
              {tab}
              {tab === 'Sellers' && pendingSubs.length > 0 && (
                <span className="ml-1.5 bg-yellow-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingSubs.length}
                </span>
              )}
              {tab === 'Approvals' && pendingApprovals.length > 0 && (
                <span className="ml-1.5 bg-brand-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingApprovals.length}
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
                    { label: 'Total Sellers',  value: stats.totals.sellers,                     color: 'text-brand-700' },
                    { label: 'Total Products', value: stats.totals.products,                    color: 'text-blue-700' },
                    { label: 'Total Orders',   value: stats.totals.orders,                      color: 'text-yellow-700' },
                    { label: 'Revenue',        value: `EGP ${stats.totals.revenue.toFixed(0)}`, color: 'text-green-700' },
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
                  <h3 className="font-black text-gray-900 mb-1">Best Selling Product</h3>
                  {stats.bestSelling ? (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-bold">{stats.bestSelling.productName}{stats.bestSelling.productNameEn ? ` (${stats.bestSelling.productNameEn})` : ''}</span>
                      {stats.bestSelling.brand && <span className="text-gray-500"> · {stats.bestSelling.brand}</span>}
                      <span className="ml-2 text-brand-700 font-semibold">{stats.bestSelling.units} units sold</span>
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
                            <span className="w-5 h-5 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                            <span className="font-semibold text-gray-900">{seller.businessName}</span>
                            {seller.city && <span className="text-gray-400 text-xs">{seller.city}</span>}
                          </div>
                          <span className="font-black text-gray-900 tabular-nums">EGP {seller.revenueAed.toFixed(0)}</span>
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
                        <tr className="border-b border-gray-100 bg-[#FBF6EF]">
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
                          <tr key={sub.id} className="hover:bg-[#FBF6EF] transition-colors">
                            <td className="px-5 py-4 font-semibold text-gray-900">{sub.seller?.businessName ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.user?.email ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.city ?? '—'}</td>
                            <td className="px-4 py-4 text-right font-semibold tabular-nums">EGP {Number(sub.price).toFixed(0)}</td>
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
                                  className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
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
                        <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Business</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                          <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Amount EGP</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Payment</th>
                          <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {subscriptions.map(sub => (
                          <tr key={sub.id} className="hover:bg-[#FBF6EF] transition-colors">
                            <td className="px-5 py-4 font-semibold text-gray-900">{sub.seller?.businessName ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.user?.email ?? '—'}</td>
                            <td className="px-4 py-4 text-gray-600">{sub.seller?.city ?? '—'}</td>
                            <td className="px-4 py-4 text-right font-semibold tabular-nums">{Number(sub.price).toFixed(0)}</td>
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
                      <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                        <th className="px-5 py-3.5 w-12" />
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Business</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pending.map(seller => (
                        <tr key={seller.id} className="hover:bg-[#FBF6EF] transition-colors">
                          <td className="px-5 py-2.5">
                            {seller.logoUrl ? (
                              <img src={seller.logoUrl} alt={seller.businessName}
                                  className="w-10 h-10 rounded-full object-cover bg-brand-50 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                <span className="text-brand-600 font-black text-sm">{(seller.businessName ?? 'S')[0].toUpperCase()}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{seller.businessName}</td>
                          <td className="px-4 py-2.5 text-gray-600">{seller.user?.email ?? '—'}</td>
                          <td className="px-4 py-2.5 text-gray-600">{seller.city ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => handleApproveSeller(seller.id)}
                              disabled={approving === seller.id}
                              className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
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
                      <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                        <th className="px-5 py-3.5 w-12" />
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Business</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Approval</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Subscription</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sellers.map(seller => {
                        const subStatus = seller.subscriptionStatus ?? 'PENDING'
                        const subColors = { ACTIVE: 'bg-green-100 text-green-700', SUSPENDED: 'bg-red-100 text-red-600', PENDING: 'bg-yellow-100 text-yellow-700' }
                        return (
                        <tr key={seller.id} className="hover:bg-[#FBF6EF] transition-colors">
                          <td className="px-5 py-2.5">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                              <span className="text-brand-600 font-black text-sm">{(seller.businessName ?? 'S')[0].toUpperCase()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{seller.businessName}</td>
                          <td className="px-4 py-2.5 text-gray-600">{seller.user?.email ?? '—'}</td>
                          <td className="px-4 py-2.5 text-gray-600">{seller.city ?? '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${seller.approvedByAdmin ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {seller.approvedByAdmin ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${subColors[subStatus]}`}>
                              {subStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {subStatus !== 'ACTIVE' && (
                                <button
                                  onClick={() => handleSubscription(seller.id, 'activate')}
                                  disabled={subActioning === seller.id}
                                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors"
                                >
                                  Activate
                                </button>
                              )}
                              {subStatus === 'ACTIVE' && (
                                <button
                                  onClick={() => handleSubscription(seller.id, 'suspend')}
                                  disabled={subActioning === seller.id}
                                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        )
                      })}
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
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-56"
              />
              <select
                value={userRole}
                onChange={e => setUserRole(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
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
                      <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                        <th className="px-5 py-3.5 w-12" />
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
                      {filteredUsers.map(u => {
                        const displayName = u.customerProfile?.fullName || u.sellerProfile?.businessName || u.email
                        const roleColors  = {
                          admin:      'bg-brand-100 text-brand-700',
                          wholesaler: 'bg-blue-100 text-blue-700',
                          retailer:   'bg-accent-100 text-accent-700',
                          customer:   'bg-gray-100 text-gray-600',
                        }
                        return (
                        <tr key={u.id} className={`hover:bg-[#FBF6EF] transition-colors ${u.isBanned ? 'opacity-60' : ''}`}>
                          <td className="px-5 py-2.5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${
                              u.role === 'admin'      ? 'bg-brand-100 text-brand-700' :
                              u.role === 'retailer'   ? 'bg-accent-100 text-accent-700' :
                              u.role === 'wholesaler' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {displayName[0].toUpperCase()}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 font-medium">{u.email}</td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {u.customerProfile?.fullName || u.sellerProfile?.businessName || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${roleColors[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{u.city ?? '—'}</td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{u._count?.orders ?? 0}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {new Date(u.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                              {u.isBanned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
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
                        )
                      })}
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

            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search by name or brand…"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-64"
              />
              <select
                value={productStatus}
                onChange={e => setProductStatus(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
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
                          <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                            <th className="px-5 py-3.5 w-12" />
                            <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Product</th>
                            <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Brand</th>
                            <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Category</th>
                            <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Seller</th>
                            <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Price EGP</th>
                            <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Listed</th>
                            <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredProducts.map(p => {
                            const prices = p.variants?.map(v => Number(v.price)) ?? []
                            const minP   = prices.length ? Math.min(...prices) : null
                            const maxP   = prices.length ? Math.max(...prices) : null
                            const priceStr = minP === null ? '—'
                              : minP === maxP ? `${minP.toFixed(0)}`
                              : `${minP.toFixed(0)}–${maxP.toFixed(0)}`
                            return (
                              <tr key={p.id} className={`hover:bg-[#FBF6EF] transition-colors ${!p.isActive ? 'opacity-60' : ''}`}>
                                <td className="px-5 py-2.5">
                                  {(() => {
                                    const thumb = p.images?.[0] || p.variants?.find(v => v.image)?.image || null
                                    return thumb ? (
                                      <img src={thumb} alt={p.name}
                                        className="w-10 h-10 rounded-lg object-cover bg-brand-50 shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                                        <span className="text-brand-600 font-black text-sm">{(p.brand ?? p.name ?? 'P')[0].toUpperCase()}</span>
                                      </div>
                                    )
                                  })()}
                                </td>
                                <td className="px-4 py-2.5">
                                  <Link href={`/products/${p.id}`} className="font-semibold text-gray-900 hover:text-brand-700 transition-colors">
                                    {p.name}{p.nameEn ? <span className="text-gray-400 font-normal"> ({p.nameEn})</span> : null}
                                  </Link>
                                </td>
                                <td className="px-4 py-2.5 text-gray-600">{p.brand ?? '—'}</td>
                                <td className="px-4 py-2.5 text-gray-600 capitalize">{p.category?.name ?? '—'}</td>
                                <td className="px-4 py-2.5 text-gray-600">{p.seller?.businessName ?? '—'}</td>
                                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{priceStr}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">
                                  {new Date(p.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {p.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
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
                    placeholder="e.g. Coffee & Jabana"
                    required
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-52"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Icon / Emoji</label>
                  <input
                    type="text"
                    value={catForm.icon}
                    onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}
                    placeholder="e.g. 💨"
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-32"
                  />
                </div>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
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
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-44"
                          />
                          <input
                            type="text"
                            value={editingCat.icon ?? ''}
                            onChange={e => setEditingCat(v => ({ ...v, icon: e.target.value }))}
                            placeholder="Icon"
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-24"
                          />
                          <button type="submit" disabled={catSaving} className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
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
                            className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-[#FBF6EF] transition-colors"
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
                                className="border border-gray-200 rounded-xl px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-44"
                              />
                              <button type="submit" disabled={catSaving} className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded-full">
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
                                  className="text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-[#FBF6EF] transition-colors"
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
                          className="border border-dashed border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 w-48 placeholder-gray-400"
                        />
                        <button
                          onClick={() => handleAddSubcategory(cat.id)}
                          disabled={subSaving === cat.id || !subForms[cat.id]?.trim()}
                          className="bg-gray-100 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
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
                {/* NOTE: Total/This Month below come from GET /api/admin/commission,
                    which sums Order.commission — a snapshot taken at order
                    CREATION using a separate, still-hardcoded 10% rate
                    (app/api/orders/route.js). It does not reflect the real,
                    now-admin-configurable rate actually charged at DELIVERY
                    via the wallet ledger (lib/wallet.js's deductCommission,
                    CommissionSetting). Pre-existing inconsistency, out of
                    scope for the rate-configurability change below — see
                    PROGRESS.md. Only "Current Commission Rate" reflects reality. */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Commission',      value: `EGP ${Number(commission.totalCommission ?? 0).toFixed(2)}`,  color: 'text-brand-700' },
                    { label: 'This Month',            value: `EGP ${Number(commission.monthCommission ?? 0).toFixed(2)}`,  color: 'text-blue-700' },
                    { label: 'Current Commission Rate', value: commissionRateInfo ? `${(commissionRateInfo.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%` : '—', color: 'text-gray-900' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Commission rate management */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-base font-black text-gray-900 mb-1">Commission Rate</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Applied to every order's goods subtotal when it's marked delivered. Changing it never
                    recalculates past charges — shops keep the rate they were actually charged at the time.
                  </p>
                  <form onSubmit={handleSetCommissionRate} className="flex flex-wrap items-end gap-3">
                    <div>
                      <label htmlFor="rateInput" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                        New rate (%)
                      </label>
                      <input
                        id="rateInput"
                        type="number" min="0" max="100" step="0.01"
                        value={rateInput}
                        onChange={e => setRateInput(e.target.value)}
                        placeholder={commissionRateInfo ? `${(commissionRateInfo.rate * 100).toFixed(2).replace(/\.?0+$/, '')}` : '5'}
                        className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={rateSaving || rateInput === ''}
                      className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      {rateSaving ? 'Saving…' : 'Update rate'}
                    </button>
                  </form>
                  {rateError && <p className="text-sm text-red-600 mt-2">{rateError}</p>}

                  {commissionRateInfo?.history?.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Change history</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {commissionRateInfo.history.map(h => (
                          <div key={h.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {(Number(h.rate) * 100).toFixed(2).replace(/\.?0+$/, '')}%
                              {h.updatedByUser ? ` — ${h.updatedByUser.email}` : ' — default'}
                            </span>
                            <span className="text-gray-400 tabular-nums">{new Date(h.createdAt).toLocaleString('en-GB')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* By seller */}
                {commission.bySeller?.length > 0 && (
                  <section>
                    <h2 className="text-base font-black text-gray-900 mb-4">Commission by Seller</h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-[#FBF6EF]">
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
                              <tr key={row.sellerId} className="hover:bg-[#FBF6EF] transition-colors">
                                <td className="px-5 py-3.5 text-gray-400 text-xs">{i + 1}</td>
                                <td className="px-4 py-3.5 font-semibold text-gray-900">{row.businessName}</td>
                                <td className="px-4 py-3.5 text-gray-600">{row.city ?? '—'}</td>
                                <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-gray-700">
                                  EGP {Number(row.totalRevenue).toFixed(2)}
                                </td>
                                <td className="px-4 py-3.5 text-right font-black tabular-nums text-brand-700">
                                  EGP {Number(row.totalCommission).toFixed(2)}
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
                                <span className="text-[10px] font-bold text-brand-700 tabular-nums">
                                  {Number(m.commission) > 0 ? Number(m.commission).toFixed(0) : ''}
                                </span>
                                <div
                                  className="w-full bg-brand-700 rounded-t-md transition-all"
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

        {/* ── CATALOG TAB ── */}
        {activeTab === 'Catalog' && (
          <div className="space-y-6">
            {/* Form: shown when adding or editing */}
            {showMasterForm ? (
              <MasterProductForm
                key={editingMaster?.id ?? 'new'}
                categories={categories}
                initial={editingMaster}
                onSave={product => {
                  if (editingMaster) {
                    setMasterProducts(prev => prev.map(p => p.id === product.id ? product : p))
                  } else {
                    setMasterProducts(prev => [product, ...prev])
                  }
                  setShowMasterForm(false)
                  setEditingMaster(null)
                }}
                onCancel={() => { setShowMasterForm(false); setEditingMaster(null) }}
              />
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{masterProducts.length} product{masterProducts.length !== 1 ? 's' : ''} in catalog</p>
                <button
                  onClick={() => { setEditingMaster(null); setShowMasterForm(true) }}
                  className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  + Add to Catalog
                </button>
              </div>
            )}

            {/* Master products list */}
            {!showMasterForm && (loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-40" />
            ) : masterProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
                <p className="text-sm text-gray-400">No catalog products yet — add one above.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Product</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Category</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Brand</th>
                        <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Price Range</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {masterProducts.map(p => (
                        <tr key={p.id} className={`hover:bg-[#FBF6EF] transition-colors ${!p.isActive ? 'opacity-50' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {p.images?.[0] ? (
                                <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover bg-gray-50 shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                                  <span className="text-brand-300 font-black text-sm">{p.name[0]}</span>
                                </div>
                              )}
                              <span className="font-semibold text-gray-900">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs">{p.productType ?? '—'}</td>
                          <td className="px-4 py-3.5 text-gray-600">{p.category?.name ?? '—'}</td>
                          <td className="px-4 py-3.5 text-gray-600">{p.brand ?? '—'}</td>
                          <td className="px-4 py-3.5 text-right tabular-nums text-gray-600">
                            {p.priceMin != null ? `EGP ${Number(p.priceMin).toFixed(0)}` : '—'}
                            {p.priceMax != null && Number(p.priceMax) !== Number(p.priceMin) ? `–${Number(p.priceMax).toFixed(0)}` : ''}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {p.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setEditingMaster(p); setShowMasterForm(true) }}
                                className="text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleMaster(p.id, p.isActive)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${p.isActive ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                              >
                                {p.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── APPROVALS TAB ── */}
        {activeTab === 'Approvals' && (
          <div className="space-y-8">
            {/* Pending retailer product selections */}
            <section>
              <h2 className="text-base font-black text-gray-900 mb-4">
                Pending Product Selections
                {pendingApprovals.length > 0 && (
                  <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>
                )}
              </h2>
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-32" />
              ) : pendingApprovals.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-sm text-gray-400">No pending product approvals</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                          <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Product</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Retailer</th>
                          <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Price EGP</th>
                          <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Stock</th>
                          <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Admin Note</th>
                          <th className="px-4 py-3.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pendingApprovals.map(item => (
                          <tr key={item.id} className="hover:bg-[#FBF6EF] transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-gray-900">{item.masterProduct?.name ?? '—'}</td>
                            <td className="px-4 py-3.5 text-gray-600">{item.retailer?.businessName ?? '—'} {item.retailer?.city ? `· ${item.retailer.city}` : ''}</td>
                            <td className="px-4 py-3.5 text-right tabular-nums font-semibold">{Number(item.price).toFixed(0)}</td>
                            <td className="px-4 py-3.5 text-center text-gray-600">{item.stockQty}</td>
                            <td className="px-4 py-3.5">
                              <input
                                type="text"
                                placeholder="Optional note…"
                                value={noteRP[item.id] ?? ''}
                                onChange={e => setNoteRP(n => ({ ...n, [item.id]: e.target.value }))}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-brand-400"
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRetailerProductAction(item.id, 'approve')}
                                  disabled={actioningRP === item.id}
                                  className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRetailerProductAction(item.id, 'reject')}
                                  disabled={actioningRP === item.id}
                                  className="border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                                >
                                  Reject
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

            {/* Product requests (new products not in catalog) */}
            <section>
              <h2 className="text-base font-black text-gray-900 mb-4">
                New Product Requests
                {productRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {productRequests.filter(r => r.status === 'PENDING').length}
                  </span>
                )}
              </h2>
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-24" />
              ) : productRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-sm text-gray-400">No product requests</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Product Name</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Retailer</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Notes</th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {productRequests.map(r => (
                        <tr key={r.id} className="hover:bg-[#FBF6EF] transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-gray-900">{r.name}</td>
                          <td className="px-4 py-3.5 text-gray-600">{r.retailer?.businessName ?? '—'}</td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs max-w-48 truncate">{r.notes ?? '—'}</td>
                          <td className="px-4 py-3.5 text-gray-400 text-xs">
                            {new Date(r.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {r.status === 'PENDING' && (
                              <button
                                onClick={() => handleMarkRequestReviewed(r.id)}
                                className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                Mark Reviewed
                              </button>
                            )}
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

        {/* ── WALLETS TAB ── */}
        {activeTab === 'Wallets' && <WalletsTab />}

        {/* ── TRAFFIC TAB ── */}
        {activeTab === 'Traffic' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Total Page Views', value: traffic?.totalHits  ?? '—', color: 'text-brand-700' },
                { label: 'Unique IPs',        value: traffic?.uniqueIps ?? '—', color: 'text-blue-700'   },
                { label: 'Days Tracked',      value: traffic?.dailyHits?.length ?? '—', color: 'text-gray-900' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                  {loading
                    ? <div className="h-8 w-20 bg-brand-50 rounded animate-pulse mt-1" />
                    : <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  }
                </div>
              ))}
            </div>

            {/* Daily chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-900 text-sm mb-4">Hits — Last 30 Days</h2>
              {loading ? (
                <div className="h-24 bg-brand-50 rounded-xl animate-pulse" />
              ) : traffic?.dailyHits?.length ? (
                <div className="flex items-end gap-1 h-28">
                  {(() => {
                    const max = Math.max(...traffic.dailyHits.map(d => d.count), 1)
                    return traffic.dailyHits.map(d => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.date}: ${d.count}`}>
                        <div
                          className="w-full bg-brand-600 rounded-t"
                          style={{ height: `${Math.max((d.count / max) * 96, 2)}px` }}
                        />
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No traffic data yet</p>
              )}
            </div>

            {/* Top pages + top countries side by side */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="font-black text-gray-900 text-sm">Top Pages</h2>
                </div>
                {loading ? (
                  <div className="p-5 space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-brand-50 rounded animate-pulse" />)}</div>
                ) : traffic?.topPages?.length ? (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {traffic.topPages.map((r, i) => (
                        <tr key={i} className="hover:bg-[#FBF6EF] transition-colors">
                          <td className="px-5 py-3 text-gray-700 font-medium truncate max-w-[180px]">{r.page}</td>
                          <td className="px-5 py-3 text-right font-black text-brand-700 tabular-nums">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">No data yet</p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="font-black text-gray-900 text-sm">Top Countries</h2>
                </div>
                {loading ? (
                  <div className="p-5 space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-brand-50 rounded animate-pulse" />)}</div>
                ) : traffic?.topCountries?.length ? (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {traffic.topCountries.map((r, i) => (
                        <tr key={i} className="hover:bg-[#FBF6EF] transition-colors">
                          <td className="px-5 py-3 text-gray-700 font-medium">{r.country}</td>
                          <td className="px-5 py-3 text-right font-black text-brand-700 tabular-nums">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">No data yet</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
