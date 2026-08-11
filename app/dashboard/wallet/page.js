'use client'
import { useState, useEffect, useCallback } from 'react'
import { getLocaleCookie, t } from '../../../lib/i18n'

const NEAR_LIMIT_THRESHOLD = -70 // warn before the -100 hard block

const TYPE_LABEL_KEY = {
  COMMISSION: 'wallet.commission',
  TOPUP:      'wallet.topup',
  ADJUSTMENT: 'wallet.adjustment',
}

export default function SellerWalletPage() {
  const [wallet,  setWallet]  = useState(null)
  const [ledger,  setLedger]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [locale,  setLocale]  = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/seller/wallet', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWallet(data.wallet)
      setLedger(data.ledger ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load wallet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-64" />
  }

  const balance    = wallet ? Number(wallet.balance) : 0
  const isPositive = balance >= 0
  const dir        = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h1 className="text-2xl font-black text-gray-900">{t('wallet.title', locale)}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
      )}

      {/* Balance card */}
      <div className={`rounded-2xl border shadow-sm p-6 ${
        wallet?.blocked ? 'bg-hibiscus-50 border-hibiscus-400/40' : 'bg-white border-gray-100'
      }`}>
        <p className="text-sm font-semibold text-gray-500">
          {isPositive ? t('wallet.youHave', locale) : t('wallet.youOwe', locale)}
        </p>
        <p className={`text-4xl font-black tabular-nums mt-1 ${isPositive ? 'text-gray-900' : 'text-hibiscus-600'}`}>
          EGP {Math.abs(balance).toFixed(2)}
        </p>

        {wallet?.commissionRate != null && (
          <p className="text-xs font-semibold text-gray-400 mt-2">
            {t('wallet.currentRate', locale)}: {(Number(wallet.commissionRate) * 100).toFixed(2).replace(/\.?0+$/, '')}%
          </p>
        )}

        {wallet?.blocked ? (
          <div className="flex items-start gap-2.5 mt-4 bg-white/70 rounded-xl px-3.5 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-hibiscus-500 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-sm font-bold text-hibiscus-700">{t('wallet.warningBlocked', locale)}</p>
          </div>
        ) : balance <= NEAR_LIMIT_THRESHOLD ? (
          <div className="flex items-start gap-2.5 mt-4 bg-accent-50 rounded-xl px-3.5 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-accent-500 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-sm font-bold text-accent-700">{t('wallet.warningNear', locale)}</p>
          </div>
        ) : null}
      </div>

      {/* Ledger */}
      <div>
        <h2 className="font-black text-gray-900 mb-3">{t('wallet.history', locale)}</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {ledger.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">{t('wallet.noHistory', locale)}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {ledger.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {t(TYPE_LABEL_KEY[tx.type] ?? tx.type, locale)}
                      {tx.orderId && <span className="text-gray-400 font-semibold"> · {t('wallet.order', locale)} #{tx.orderId}</span>}
                    </p>
                    {tx.note && <p className="text-xs text-gray-400 mt-0.5">{tx.note}</p>}
                    <p className="text-[11px] text-gray-300 mt-0.5">{new Date(tx.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className={`text-sm font-black tabular-nums ${Number(tx.amount) >= 0 ? 'text-green-600' : 'text-hibiscus-600'}`}>
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
    </div>
  )
}
