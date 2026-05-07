'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from 'next-auth/react'
import Link from 'next/link'

const UAE_CITIES = [
  'Abu Dhabi', 'Ajman', 'Al Ain', 'Dubai',
  'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain',
]

export default function OnboardingPage() {
  const router = useRouter()

  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  const [fullName,     setFullName]     = useState('')
  const [phone,        setPhone]        = useState('')
  const [city,         setCity]         = useState('')
  const [becomeSeller, setBecomeSeller] = useState(false)
  const [businessName, setBusinessName] = useState('')

  useEffect(() => {
    getSession().then(session => {
      if (!session) {
        router.replace('/login')
      } else {
        setLoading(false)
      }
    })
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }
    if (becomeSeller && !businessName.trim()) {
      setError('Business name is required for sellers.')
      return
    }

    setSubmitting(true)
    try {
      const res  = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fullName, phone, city, becomeSeller, businessName }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      const role = data.role
      if (role === 'retailer' || role === 'wholesaler') {
        router.push('/dashboard')
      } else {
        router.push('/')
      }
    } catch {
      setError('Unable to connect. Check your internet connection.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <div className="bg-teal-400 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          toba<span className="text-yellow-300">ki</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-md p-8">

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-gray-900">Welcome to Tobaki</h1>
            <p className="text-gray-500 text-sm mt-1">Finish setting up your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Full name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+971 50 000 0000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-1.5">
                City <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="city"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition bg-white"
              >
                <option value="">Select your city</option>
                {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Become a seller */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={becomeSeller}
                  onChange={e => setBecomeSeller(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  becomeSeller
                    ? 'bg-teal-400 border-teal-400'
                    : 'border-gray-300 group-hover:border-teal-400'
                }`}>
                  {becomeSeller && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-600 leading-snug select-none">
                I want to <span className="font-semibold">sell on Tobaki</span>
              </span>
            </label>

            {/* Business name — seller only */}
            {becomeSeller && (
              <div>
                <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Business name <span className="text-red-400">*</span>
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Dubai Vape Store"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-teal-400 hover:bg-teal-500 active:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-colors mt-2"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
