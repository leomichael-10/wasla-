'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLocaleCookie, t } from '../../lib/i18n'
import Wordmark from '../../components/Wordmark'

// Matches app/register/page.js's password input (minLength={6}) and
// app/api/auth/reset-password/route.js's MIN_PASSWORD_LENGTH — the task
// asked to match the existing signup rule, not invent a new one.
const MIN_PASSWORD_LENGTH = 6

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const email  = params.get('email') ?? ''
  const code   = params.get('code') ?? ''

  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState('')
  const [submitting,      setSubmitting]      = useState(false)
  const [success,         setSuccess]         = useState(false)
  const [locale,          setLocale]          = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('resetPassword.tooShortError', locale))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.mismatchError', locale))
      return
    }

    setSubmitting(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setSuccess(true)
      setTimeout(() => router.push('/login'), 1500)
    } catch {
      // Every server-side failure reason (wrong/expired/locked code,
      // rate limit) collapses to one message here — see
      // app/api/auth/reset-password/route.js for why distinguishing them
      // would leak whether a pending reset exists for this email.
      setError(t('resetPassword.genericError', locale))
    } finally {
      setSubmitting(false)
    }
  }

  const invalidLink = !email || !code

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex flex-col">

      <div className="bg-brand-700 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          <Wordmark />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-lg border border-brand-50 w-full max-w-md p-8">

          {invalidLink ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h1 className="text-xl font-black text-gray-900">{t('resetPassword.invalidLinkHeading', locale)}</h1>
              <p className="text-gray-500 text-sm mt-2">{t('resetPassword.invalidLinkBody', locale)}</p>
              <Link
                href="/forgot-password"
                className="inline-block mt-6 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white font-black px-6 py-2.5 rounded-2xl text-sm transition-all duration-200"
              >
                {t('resetPassword.requestNewLink', locale)}
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h1 className="text-xl font-black text-gray-900">{t('resetPassword.successHeading', locale)}</h1>
              <p className="text-gray-500 text-sm mt-2">{t('resetPassword.successBody', locale)}</p>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-black text-gray-900">{t('resetPassword.heading', locale)}</h1>
                <p className="text-gray-500 text-sm mt-1">{t('resetPassword.subtitle', locale)}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('resetPassword.newPasswordLabel', locale)}
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('resetPassword.confirmLabel', locale)}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-700 hover:bg-brand-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all duration-200 mt-2"
                >
                  {submitting ? t('resetPassword.submitting', locale) : t('resetPassword.submit', locale)}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
