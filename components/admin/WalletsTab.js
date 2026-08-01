'use client'
import { useState, useEffect, useCallback } from 'react'

const TYPE_STYLE = {
  COMMISSION: 'text-hibiscus-600',
  TOPUP:      'text-green-600',
  ADJUSTMENT: 'text-gray-700',
}

function WalletDetail({ sellerId, onClose, onChanged }) {
  const [wallet,  setWallet]  = useState(null)
  const [ledger,  setLedger]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [topupAmount, setTopupAmount] = useState('')
  const [topupNote,   setTopupNote]   = useState('')
  const [topupBusy,   setTopupBusy]   = useState(false)

  const [adjAmount, setAdjAmount] = useState('')
  const [adjNote,   setAdjNote]   = useState('')
  const [adjBusy,   setAdjBusy]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/admin/wallets/${sellerId}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWallet(data.wallet)
      setLedger(data.ledger ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load wallet.')
    } finally {
      setLoading(false)
    }
  }, [sellerId])

  useEffect(() => { load() }, [load])

  async function handleTopup(e) {
    e.preventDefault()
    setError('')
    setTopupBusy(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/admin/wallets/${sellerId}/topup`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(topupAmount), note: topupNote || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTopupAmount(''); setTopupNote('')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Top-up failed.')
    } finally {
      setTopupBusy(false)
    }
  }

  async function handleAdjustment(e) {
    e.preventDefault()
    setError('')
    setAdjBusy(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch(`/api/admin/wallets/${sellerId}/adjustment`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(adjAmount), note: adjNote }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAdjAmount(''); setAdjNote('')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Adjustment failed.')
    } finally {
      setAdjBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-black text-gray-900">{wallet?.businessName ?? 'Wallet'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          {loading ? (
            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <>
              <div className={`rounded-2xl p-5 ${wallet.blocked ? 'bg-hibiscus-50 border border-hibiscus-400/40' : 'bg-[#FBF6EF]'}`}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Balance</p>
                <p className={`text-3xl font-black tabular-nums mt-1 ${Number(wallet.walletBalance) < 0 ? 'text-hibiscus-600' : 'text-gray-900'}`}>
                  EGP {Number(wallet.walletBalance).toFixed(2)}
                </p>
                {wallet.blocked && (
                  <span className="inline-block mt-2 text-xs font-bold bg-hibiscus-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Blocked — balance ≤ −100
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <form onSubmit={handleTopup} className="space-y-2 border border-gray-100 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-900">Top up</p>
                  <input
                    type="number" min="0.01" step="0.01" required
                    value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                    placeholder="Amount (EGP)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <input
                    type="text" value={topupNote} onChange={e => setTopupNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button type="submit" disabled={topupBusy}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-sm transition-colors">
                    {topupBusy ? '…' : '+ Top up'}
                  </button>
                </form>

                <form onSubmit={handleAdjustment} className="space-y-2 border border-gray-100 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-900">Manual adjustment</p>
                  <input
                    type="number" step="0.01" required
                    value={adjAmount} onChange={e => setAdjAmount(e.target.value)}
                    placeholder="Amount (+/− EGP)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <input
                    type="text" required value={adjNote} onChange={e => setAdjNote(e.target.value)}
                    placeholder="Reason (required)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button type="submit" disabled={adjBusy}
                    className="w-full bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-sm transition-colors">
                    {adjBusy ? '…' : 'Post adjustment'}
                  </button>
                </form>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900 mb-2">Ledger</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {ledger.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                      {ledger.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {tx.type}{tx.orderId ? ` · Order #${tx.orderId}` : ''}
                            </p>
                            {tx.note && <p className="text-xs text-gray-400">{tx.note}</p>}
                            <p className="text-[11px] text-gray-300">{new Date(tx.createdAt).toLocaleString('en-GB')}{tx.admin ? ` · ${tx.admin.email}` : ''}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black tabular-nums ${TYPE_STYLE[tx.type] ?? 'text-gray-700'}`}>
                              {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                            </p>
                            <p className="text-[11px] text-gray-400 tabular-nums">EGP {Number(tx.balanceAfter).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WalletsTab() {
  const [wallets, setWallets] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/admin/wallets', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWallets(data.wallets ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load wallets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const blockedShops = wallets.filter(w => w.blocked)

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>}

      {blockedShops.length > 0 && (
        <div className="bg-hibiscus-50 border border-hibiscus-400/40 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-hibiscus-500 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h2 className="font-black text-hibiscus-700">{blockedShops.length} shop{blockedShops.length !== 1 ? 's' : ''} blocked — can't receive new orders</h2>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {blockedShops.map(w => (
              <button
                key={w.id}
                onClick={() => setSelected(w.id)}
                className="text-xs font-bold bg-white text-hibiscus-600 px-3 py-1.5 rounded-full border border-hibiscus-400/40 hover:bg-hibiscus-100 transition-colors"
              >
                {w.businessName} · EGP {Number(w.walletBalance).toFixed(0)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FBF6EF]">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Shop</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Balance</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : wallets.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No shops yet</td></tr>
              ) : (
                wallets.map(w => (
                  <tr key={w.id} className="hover:bg-[#FBF6EF] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{w.businessName}</td>
                    <td className="px-4 py-3.5 text-gray-600">{w.city ?? '—'}</td>
                    <td className={`px-4 py-3.5 text-right font-black tabular-nums ${Number(w.walletBalance) < 0 ? 'text-hibiscus-600' : 'text-gray-900'}`}>
                      EGP {Number(w.walletBalance).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {w.blocked ? (
                        <span className="text-xs font-bold bg-hibiscus-100 text-hibiscus-700 px-2.5 py-1 rounded-full">Blocked</span>
                      ) : (
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => setSelected(w.id)} className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <WalletDetail sellerId={selected} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  )
}
