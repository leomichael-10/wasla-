'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const RESEND_COOLDOWN_SEC = 30

function VerifyEmailForm() {
  const params = useSearchParams()
  const router = useRouter()
  const email = params.get('email') ?? ''

  const [code,       setCode]       = useState('')
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const [verifying,  setVerifying]  = useState(false)
  const [resending,  setResending]  = useState(false)
  const [resendMsg,  setResendMsg]  = useState('')
  const [cooldown,   setCooldown]   = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setVerifying(true)
    try {
      const res  = await fetch('/api/auth/verify-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 1500)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setResending(true)
    setResendMsg('')
    try {
      const res  = await fetch('/api/auth/resend-email-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      setResendMsg(data.message ?? 'تم الإرسال.')
      setCooldown(RESEND_COOLDOWN_SEC)
    } catch {
      setResendMsg('تعذر الإرسال. حاول تاني.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex flex-col">
      <div className="bg-brand-700 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          was<span className="text-accent-300">la</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-lg border border-brand-50 w-full max-w-md p-8">
          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h1 className="text-xl font-black text-gray-900">تم تفعيل بريدك الإلكتروني!</h1>
              <p className="text-gray-500 text-sm mt-2">جاري تحويلك لصفحة تسجيل الدخول…</p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-black text-gray-900">فعّل حسابك</h1>
                <p className="text-gray-500 text-sm mt-1">
                  بعتنا كود مكوّن من 6 أرقام لـ <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
                )}
                <div>
                  <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-1.5">كود التفعيل</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-black focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="w-full bg-brand-700 hover:bg-brand-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all duration-200"
                >
                  {verifying ? 'جاري التحقق…' : 'تفعيل الحساب'}
                </button>
              </form>

              <div className="mt-5 text-center">
                {resendMsg && <p className="text-xs text-gray-500 mb-2">{resendMsg}</p>}
                <button
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `أعد الإرسال بعد ${cooldown} ثانية` : resending ? 'جاري الإرسال…' : 'إعادة إرسال الكود'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  )
}
