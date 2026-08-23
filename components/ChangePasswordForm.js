'use client'
import { useState } from 'react'
import { t } from '../lib/i18n'
import { useUser } from '../lib/UserContext'

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

// Maps the API's stable error `code` (see app/api/profile/change-password/
// route.js) to a localized message — never displays the API's raw
// (English-only) error text directly, so every outcome stays bilingual.
const ERROR_KEY_BY_CODE = {
  WRONG_PASSWORD: 'changePassword.wrongPassword',
  GOOGLE_ONLY:    'changePassword.googleOnly',
  RATE_LIMITED:   'changePassword.rateLimited',
  TOO_SHORT:      'changePassword.tooShortError',
}

export default function ChangePasswordForm({ locale }) {
  const { login } = useUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 6) {
      setError(t('changePassword.tooShortError', locale))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.mismatchError', locale))
      return
    }

    setSaving(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/profile/change-password', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(t(ERROR_KEY_BY_CODE[data.code] ?? 'changePassword.genericError', locale))
        return
      }

      // The change just invalidated this device's own old token too (see
      // middleware.js's passwordChangedAt check) — the route returns a
      // fresh one so this session survives the change instead of the
      // very next request silently 401ing.
      localStorage.setItem('wasla_token', data.token)
      localStorage.setItem('wasla_user', JSON.stringify(data.user))
      login(data.user)

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError(t('changePassword.genericError', locale))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl px-4 py-3">
          {t('changePassword.success', locale)}
        </div>
      )}
      <div>
        <label className={labelCls}>{t('changePassword.current', locale)}</label>
        <input
          type="password" autoComplete="current-password" required
          value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>{t('changePassword.new', locale)}</label>
        <input
          type="password" autoComplete="new-password" required minLength={6}
          value={newPassword} onChange={e => setNewPassword(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>{t('changePassword.confirm', locale)}</label>
        <input
          type="password" autoComplete="new-password" required minLength={6}
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          className={inputCls}
        />
      </div>
      <button
        type="submit" disabled={saving}
        className="bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl transition-colors"
      >
        {saving ? t('changePassword.saving', locale) : t('changePassword.submit', locale)}
      </button>
    </form>
  )
}
