'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from 'next-auth/react'
import Link from 'next/link'
import { isEgyptianPhone, normalizeDigits } from '../../lib/phone'

const EGYPT_CITIES = [
  'Cairo', 'Giza', '6th of October', 'Alexandria',
]

export default function OnboardingPage() {
  const router = useRouter()

  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  const [fullName,     setFullName]     = useState('')
  const [phone,        setPhone]        = useState('')
  const [city,         setCity]         = useState('')

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
    if (phone && !isEgyptianPhone(phone)) {
      setError('Please enter a valid Egyptian mobile number (e.g. 01012345678).')
      return
    }

    setSubmitting(true)
    try {
      const res  = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fullName, phone: phone ? normalizeDigits(phone) : phone, city }),
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
      <div className="min-h-screen bg-[#FBF6EF] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex flex-col">

      <div className="bg-brand-700 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          was<span className="text-yellow-300">la</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-md p-8">

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-gray-900">Welcome to Wasla</h1>
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
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
                placeholder="+20 10 0000 0000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white"
              >
                <option value="">Select your city</option>
                {EGYPT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-700 hover:bg-brand-800 active:bg-brand-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-colors mt-2"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
