'use client'
import { useState } from 'react'
import { t, interpolate } from '../lib/i18n'

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition bg-white'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

// Maps the API's stable error `code` (see app/api/profile/delete-account/
// route.js) to a localized message, same pattern as
// ChangePasswordForm's ERROR_KEY_BY_CODE — never displays the API's raw
// English error text.
const ERROR_KEY_BY_CODE = {
  WRONG_PASSWORD:   'deleteAccount.errorWrongPassword',
  WRONG_CODE:       'deleteAccount.errorWrongCode',
  EXPIRED_CODE:     'deleteAccount.errorExpiredCode',
  NO_ACTIVE_CODE:   'deleteAccount.errorNoCode',
  LOCKED:           'deleteAccount.errorLocked',
  RATE_LIMITED:     'deleteAccount.errorRateLimited',
  CONFIRM_MISMATCH: 'deleteAccount.errorConfirmMismatch',
}

/**
 * Delete-account entry point + confirmation flow, shared by the customer
 * account page (app/profile/page.js) and the seller settings page
 * (app/dashboard/settings/page.js). Handles both re-auth paths (password
 * vs. an emailed code for Google-only accounts) and, for sellers, the two
 * server-side blocking conditions (active orders / a negative wallet
 * balance) — this component never decides those itself, it only relays
 * what POST /api/profile/delete-account already checked.
 */
export default function DeleteAccountSection({ locale, role, hasPassword, onDeleted }) {
  const isSeller = role === 'retailer' || role === 'wholesaler'

  const [open,           setOpen]           = useState(false)
  const [password,       setPassword]       = useState('')
  const [codeRequested,  setCodeRequested]  = useState(false)
  const [code,           setCode]           = useState('')
  const [requestingCode, setRequestingCode] = useState(false)
  const [confirmText,    setConfirmText]    = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState('')

  const expectedWord = t('deleteAccount.confirmWord', locale)
  const confirmReady = confirmText.trim().toLowerCase() === expectedWord.toLowerCase()
  const reAuthReady  = hasPassword ? password.length > 0 : codeRequested && code.length === 6

  function reset() {
    setOpen(false)
    setPassword('')
    setCodeRequested(false)
    setCode('')
    setConfirmText('')
    setError('')
  }

  async function handleRequestCode() {
    setRequestingCode(true)
    setError('')
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/profile/delete-account/request-code', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.code)
      setCodeRequested(true)
    } catch (err) {
      setError(t(ERROR_KEY_BY_CODE[err.message] ?? 'deleteAccount.errorGeneric', locale))
    } finally {
      setRequestingCode(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/profile/delete-account', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: hasPassword ? password : undefined, code: hasPassword ? undefined : code, confirmText }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'ACTIVE_ORDERS') {
          setError(interpolate(t('deleteAccount.errorActiveOrders', locale), { count: data.count }))
        } else if (data.code === 'NEGATIVE_BALANCE') {
          setError(interpolate(t('deleteAccount.errorNegativeBalance', locale), { amount: Number(data.amount).toFixed(2) }))
        } else {
          setError(t(ERROR_KEY_BY_CODE[data.code] ?? 'deleteAccount.errorGeneric', locale))
        }
        return
      }
      onDeleted?.()
    } catch {
      setError(t('deleteAccount.errorGeneric', locale))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-bold py-3 rounded-2xl text-sm transition-all duration-200"
      >
        {t('deleteAccount.openButton', locale)}
      </button>
    )
  }

  return (
    <div className="border border-red-200 rounded-2xl p-5 space-y-4 bg-red-50/40">
      <div>
        <h3 className="font-black text-red-700">{t('deleteAccount.heading', locale)}</h3>
        <p className="text-sm text-red-600 font-semibold mt-1">{t('deleteAccount.intro', locale)}</p>
      </div>

      <div className="bg-white rounded-xl p-4 space-y-3 text-sm">
        <div>
          <p className="font-bold text-gray-800 mb-1">{t('deleteAccount.keepTitle', locale)}</p>
          <ul className="list-disc ps-5 text-gray-600 space-y-0.5">
            <li>{t('deleteAccount.keepOrders', locale)}</li>
            {isSeller && <li>{t('deleteAccount.keepLedgerSeller', locale)}</li>}
          </ul>
        </div>
        <div>
          <p className="font-bold text-gray-800 mb-1">{t('deleteAccount.deleteTitle', locale)}</p>
          <ul className="list-disc ps-5 text-gray-600 space-y-0.5">
            <li>{t('deleteAccount.deletePersonal', locale)}</li>
            {isSeller && <li>{t('deleteAccount.deleteShop', locale)}</li>}
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {hasPassword ? (
          <div>
            <label className={labelCls}>{t('deleteAccount.passwordLabel', locale)}</label>
            <input
              type="password" autoComplete="current-password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={t('deleteAccount.passwordPlaceholder', locale)}
              className={inputCls}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {!codeRequested ? (
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={requestingCode}
                className="text-sm font-bold bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl transition-colors"
              >
                {requestingCode ? t('deleteAccount.requestingCode', locale) : t('deleteAccount.requestCode', locale)}
              </button>
            ) : (
              <>
                <p className="text-xs text-green-600 font-semibold">{t('deleteAccount.codeSent', locale)}</p>
                <div>
                  <label className={labelCls}>{t('deleteAccount.codeLabel', locale)}</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6} required
                    value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    className={`${inputCls} text-center tracking-[0.3em] font-bold`}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>
            {interpolate(t('deleteAccount.confirmLabel', locale), { word: expectedWord })}
          </label>
          <input
            type="text" required
            value={confirmText} onChange={e => setConfirmText(e.target.value)}
            placeholder={expectedWord}
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !reAuthReady || !confirmReady}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-3 rounded-xl text-sm transition-colors"
          >
            {submitting ? t('deleteAccount.submitting', locale) : t('deleteAccount.submit', locale)}
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('deleteAccount.cancel', locale)}
          </button>
        </div>
      </form>
    </div>
  )
}
