'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

const EGYPT_CITIES = [
  'Cairo', 'Giza', '6th of October', 'Alexandria',
]

const PAYMENT_METHODS = [
  {
    value:    'bank_transfer',
    label:    'Bank Transfer',
    detail:   'Transfer EGP 500 to: Wasla, IBAN: EG00 0000 0000 0000 0000 000',
  },
  {
    value:    'cash',
    label:    'Cash',
    detail:   'Pay in person at our Cairo office.',
  },
]

const SUBSCRIPTIONS_ENABLED = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === 'true'

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    email:        '',
    password:     '',
    role:         'customer',
    phone:        '',
    city:         '',
    businessName: '',
  })
  const [step1Error,     setStep1Error]     = useState('')
  const [step1Loading,   setStep1Loading]   = useState(false)

  const [step,            setStep]          = useState(1)
  const [paymentMethod,   setPaymentMethod] = useState('bank_transfer')
  const [termsAccepted,   setTermsAccepted] = useState(false)
  const [step2Error,      setStep2Error]    = useState('')
  const [step2Loading,    setStep2Loading]  = useState(false)
  const [submitted,       setSubmitted]     = useState(false)
  const [authToken,       setAuthToken]     = useState('')

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const isSeller = form.role === 'retailer' || form.role === 'wholesaler'

  async function handleStep1(e) {
    e.preventDefault()
    setStep1Error('')
    setStep1Loading(true)

    const body = {
      email:    form.email,
      password: form.password,
      role:     form.role,
      phone:    form.phone || undefined,
      city:     form.city  || undefined,
    }
    if (isSeller) body.businessName = form.businessName

    try {
      const regRes  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const regData = await regRes.json()
      if (!regRes.ok) {
        setStep1Error(regData.error ?? 'Registration failed. Please try again.')
        return
      }

      if (isSeller) {
        const loginRes  = await fetch('/api/auth/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: form.email, password: form.password }),
        })
        const loginData = await loginRes.json()
        if (!loginRes.ok) {
          router.push('/login')
          return
        }
        localStorage.setItem('wasla_token', loginData.token)
        localStorage.setItem('wasla_user',  JSON.stringify(loginData.user))

        if (SUBSCRIPTIONS_ENABLED) {
          setAuthToken(loginData.token)
          setStep(2)
        } else {
          router.push('/dashboard')
        }
      } else {
        router.push('/login')
      }
    } catch {
      setStep1Error('Unable to connect. Check your internet connection.')
    } finally {
      setStep1Loading(false)
    }
  }

  async function handleStep2(e) {
    e.preventDefault()
    setStep2Error('')

    if (!termsAccepted) {
      setStep2Error('Please accept Wasla terms and conditions.')
      return
    }

    setStep2Loading(true)
    try {
      const res  = await fetch('/api/subscriptions', {
        method:  'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitted(true)
    } catch (err) {
      setStep2Error(err.message || 'Failed to submit subscription. Please try again.')
    } finally {
      setStep2Loading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f9f7ff] flex flex-col">
        <div className="bg-purple-700 px-6 py-4">
          <Link href="/" className="text-white font-black text-xl tracking-tight">
            was<span className="text-amber-300">la</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-white rounded-3xl shadow-lg border border-purple-50 w-full max-w-md p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-900">Registration Submitted</h2>
            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              Our team will verify your payment and activate your account within <span className="font-semibold">24 hours</span>.
            </p>
            <Link
              href="/"
              className="inline-block mt-6 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black px-6 py-2.5 rounded-2xl text-sm transition-all duration-200"
            >
              Back to Wasla
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f7ff] flex flex-col">

      <div className="bg-purple-700 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          was<span className="text-amber-300">la</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-lg border border-purple-50 w-full max-w-md p-8">

          {step === 1 && (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-black text-gray-900">Create an account</h1>
                <p className="text-gray-500 text-sm mt-1">Join Wasla — Sudanese products, delivered in Cairo</p>
              </div>

              <form onSubmit={handleStep1} className="space-y-4">

                {step1Error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                    {step1Error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">I am a…</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'customer', label: 'Customer' },
                      { value: 'retailer', label: 'Retailer' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, role: opt.value }))}
                        className={`py-2.5 rounded-2xl text-sm font-semibold border transition-all active:scale-95 ${
                          form.role === opt.value
                            ? 'bg-purple-700 border-purple-700 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                  <input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition" />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <input id="password" type="password" autoComplete="new-password" required minLength={6}
                    value={form.password} onChange={set('password')} placeholder="At least 6 characters"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition" />
                </div>

                {isSeller && (
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Business name <span className="text-red-400">*</span>
                    </label>
                    <input id="businessName" type="text" required value={form.businessName} onChange={set('businessName')}
                      placeholder="e.g. Kassala Coffee House"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition" />
                  </div>
                )}

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Phone <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')}
                    placeholder="+20 10 0000 0000"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition" />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    City <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select id="city" value={form.city} onChange={set('city')}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition bg-white">
                    <option value="">Select your city</option>
                    {EGYPT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={step1Loading}
                  className="w-full bg-purple-700 hover:bg-purple-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all duration-200 mt-2"
                >
                  {step1Loading ? 'Creating account…' : (isSeller && SUBSCRIPTIONS_ENABLED ? 'Continue to Subscription' : 'Create account')}
                </button>
              </form>

              {!isSeller && (
                <>
                  <div className="flex items-center gap-3 mt-6">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 font-medium">or</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <button
                    type="button"
                    onClick={() => signIn('google', { callbackUrl: '/auth/redirect' })}
                    className="mt-3 w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-[#f9f7ff] active:bg-gray-100 active:scale-95 transition-all duration-200"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign up with Google
                  </button>
                </>
              )}

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-purple-600 font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-black text-gray-900">Shop Subscription</h1>
                <p className="text-gray-500 text-sm mt-1">Join Wasla's marketplace for Sudanese shops in Cairo</p>
              </div>

              <form onSubmit={handleStep2} className="space-y-5">

                {step2Error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                    {step2Error}
                  </div>
                )}

                <div className="border-2 border-purple-600 rounded-2xl p-5 bg-purple-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-3xl font-black text-gray-900">EGP 500</p>
                      <p className="text-sm text-gray-500 font-medium">per month</p>
                    </div>
                    <span className="bg-purple-700 text-white text-xs font-black px-3 py-1 rounded-full">STANDARD</span>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Unlimited product listings',
                      'Access to all platform features',
                      'Featured on Wasla marketplace',
                    ].map(feature => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-700 shrink-0">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map(pm => (
                      <label
                        key={pm.value}
                        className={`flex items-start gap-3 cursor-pointer border-2 rounded-2xl p-4 transition-all ${
                          paymentMethod === pm.value
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-200'
                        }`}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={pm.value}
                            checked={paymentMethod === pm.value}
                            onChange={() => setPaymentMethod(pm.value)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === pm.value ? 'border-purple-600' : 'border-gray-300'}`}>
                            {paymentMethod === pm.value && (
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{pm.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{pm.detail}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative shrink-0 mt-0.5">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="sr-only" />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${termsAccepted ? 'bg-purple-700 border-purple-700' : 'border-gray-300 group-hover:border-purple-400'}`}>
                      {termsAccepted && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 leading-snug select-none">
                    I agree to <span className="text-purple-600 font-semibold">Wasla terms and conditions</span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={step2Loading || !termsAccepted}
                  className="w-full bg-purple-700 hover:bg-purple-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all duration-200"
                >
                  {step2Loading ? 'Submitting…' : 'Submit Registration'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
