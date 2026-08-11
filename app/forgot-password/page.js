'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getLocaleCookie, t } from '../../lib/i18n'
import Wordmark from '../../components/Wordmark'

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [error,     setError]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [locale,    setLocale]    = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      // The API always returns 200 with the same generic message unless
      // the request itself was malformed or rate-limited — see
      // app/api/auth/forgot-password/route.js. Never branch UI on
      // whether the email turned out to be registered.
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError(t('forgotPassword.genericError', locale))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex flex-col">

      <div className="bg-brand-700 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          <Wordmark />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-lg border border-brand-50 w-full max-w-md p-8">

          {submitted ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h1 className="text-xl font-black text-gray-900">{t('forgotPassword.successHeading', locale)}</h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">{t('forgotPassword.successBody', locale)}</p>
              <Link
                href="/login"
                className="inline-block mt-6 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white font-black px-6 py-2.5 rounded-2xl text-sm transition-all duration-200"
              >
                {t('forgotPassword.backToLogin', locale)}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-black text-gray-900">{t('forgotPassword.heading', locale)}</h1>
                <p className="text-gray-500 text-sm mt-1">{t('forgotPassword.subtitle', locale)}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t('forgotPassword.emailLabel', locale)}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-700 hover:bg-brand-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all duration-200 mt-2"
                >
                  {submitting ? t('forgotPassword.submitting', locale) : t('forgotPassword.submit', locale)}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                <Link href="/login" className="text-brand-600 font-semibold hover:underline">
                  {t('forgotPassword.backToLogin', locale)}
                </Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
