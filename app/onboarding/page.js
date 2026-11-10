'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from 'next-auth/react'
import Link from 'next/link'
import { isValidPhone, toE164 } from '../../lib/phone'
import { getLocaleCookie, t, placeName } from '../../lib/i18n'
import Wordmark from '../../components/Wordmark'
import PhonePreview from '../../components/PhonePreview'

const EGYPT_CITIES = [
  'Cairo', 'Giza', '6th of October', 'Alexandria',
]

export default function OnboardingPage() {
  const router = useRouter()

  const [loading,     setLoading]     = useState(true)
  const [isSeller,    setIsSeller]    = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [locale,      setLocale]      = useState('ar')

  const [fullName,       setFullName]       = useState('')
  const [phone,          setPhone]          = useState('')
  const [city,           setCity]           = useState('')
  const [businessName,   setBusinessName]   = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [sellerType,     setSellerType]     = useState('SHOP')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    getSession().then(session => {
      if (!session) {
        router.replace('/login')
      } else {
        setIsSeller(session.user.role === 'retailer' || session.user.role === 'wholesaler')
        setLoading(false)
      }
    })
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isSeller) {
      if (!businessName.trim()) {
        setError(t('onboarding.businessNameRequired', locale))
        return
      }
      if (!isValidPhone(whatsappNumber)) {
        setError(t('register.whatsappRequired', locale))
        return
      }
    } else if (!fullName.trim()) {
      setError(t('onboarding.fullNameRequired', locale))
      return
    }
    if (phone && !isValidPhone(phone)) {
      setError(t('register.invalidPhone', locale))
      return
    }

    setSubmitting(true)
    try {
      const body = isSeller
        ? {
            businessName:   businessName.trim(),
            whatsappNumber: toE164(whatsappNumber),
            sellerType,
            phone:          phone ? toE164(phone) : phone,
            city,
          }
        : {
            fullName,
            phone: phone ? toE164(phone) : phone,
            city,
          }

      const res  = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? t('onboarding.somethingWrong', locale))
        return
      }

      const role = data.role
      if (role === 'retailer' || role === 'wholesaler') {
        router.push('/dashboard')
      } else {
        router.push('/')
      }
    } catch {
      setError(t('auth.connectionError', locale))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">

      <div className="bg-brand-700 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          <Wordmark />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-brand-100 w-full max-w-md p-8">

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-brand-900">
              {isSeller ? t('onboarding.sellerHeading', locale) : t('onboarding.customerHeading', locale)}
            </h1>
            <p className="text-brand-400 text-sm mt-1">
              {isSeller ? t('onboarding.sellerSubtitle', locale) : t('onboarding.customerSubtitle', locale)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {isSeller ? (
              <>
                {/* Business name */}
                <div>
                  <label htmlFor="businessName" className="block text-sm font-semibold text-brand-700 mb-1.5">
                    {t('onboarding.businessName', locale)} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    required
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder={t('onboarding.businessNamePlaceholder', locale)}
                    className="w-full border border-brand-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                </div>

                {/* Business type */}
                <div>
                  <label className="block text-sm font-semibold text-brand-700 mb-1.5">
                    {t('seller.businessType', locale)} <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['SHOP', 'RESTAURANT'].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center justify-center gap-2 cursor-pointer border-2 rounded-xl py-3 text-sm font-bold transition-all ${
                          sellerType === opt
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-brand-100 text-brand-400 hover:border-brand-200'
                        }`}
                      >
                        <input
                          type="radio" name="sellerType" value={opt} className="sr-only"
                          checked={sellerType === opt}
                          onChange={() => setSellerType(opt)}
                        />
                        {opt === 'SHOP' ? t('seller.typeShop', locale) : t('seller.typeRestaurant', locale)}
                      </label>
                    ))}
                  </div>
                </div>

                {/* WhatsApp number */}
                <div>
                  <label htmlFor="whatsappNumber" className="block text-sm font-semibold text-brand-700 mb-1.5">
                    {t('onboarding.whatsappNumber', locale)} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="whatsappNumber"
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="01012345678 or +249912345678"
                    className="w-full border border-brand-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                  />
                  <PhonePreview value={whatsappNumber} />
                  <p className="text-xs text-brand-300 mt-1">{t('onboarding.whatsappHint', locale)}</p>
                </div>
              </>
            ) : (
              /* Full name */
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-brand-700 mb-1.5">
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
                  className="w-full border border-brand-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                />
              </div>
            )}

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-brand-700 mb-1.5">
                Phone <span className="text-brand-300 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="01012345678 or +249912345678"
                className="w-full border border-brand-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
              />
              <PhonePreview value={phone} />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-brand-700 mb-1.5">
                {t('register.city', locale)} <span className="text-brand-300 font-normal">{t('register.optional', locale)}</span>
              </label>
              <select
                id="city"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full border border-brand-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white"
              >
                <option value="">{t('onboarding.selectCity', locale)}</option>
                {EGYPT_CITIES.map(c => <option key={c} value={c}>{placeName(c, locale)}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-700 hover:bg-brand-800 active:bg-brand-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-colors mt-2"
            >
              {submitting ? t('onboarding.saving', locale) : t('onboarding.continue', locale)}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
