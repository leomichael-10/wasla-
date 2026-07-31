'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import AddressForm from '../../components/AddressForm'
import AddressCard from '../../components/AddressCard'
import { useUser } from '../../lib/UserContext'
import { getLocaleCookie, setLocaleCookie, t } from '../../lib/i18n'

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

export default function ProfilePage() {
  const router = useRouter()
  const { logout } = useUser()

  const [fullName,       setFullName]       = useState('')
  const [phone,          setPhone]          = useState('')
  const [whatsapp,       setWhatsapp]       = useState('')
  const [city,           setCity]           = useState('')
  const [email,          setEmail]          = useState('')
  const [emailVerified,  setEmailVerified]  = useState(false)

  const [addresses,   setAddresses]   = useState([])
  const [zones,       setZones]       = useState([])
  const [addressForm, setAddressForm] = useState(null) // null | 'new' | address object being edited

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [locale,   setLocale]   = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  const loadAddresses = useCallback(() => {
    const token = localStorage.getItem('wasla_token')
    fetch('/api/addresses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAddresses(data.addresses ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('wasla_user')
      if (!raw) { router.replace('/login?redirect=/profile'); return }
    } catch {
      router.replace('/login')
      return
    }

    const token = localStorage.getItem('wasla_token')
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const u = data.user
        if (!u) return
        setEmail(u.email ?? '')
        setEmailVerified(Boolean(u.emailVerified))
        setPhone(u.phone ?? '')
        setWhatsapp(u.whatsapp ?? '')
        setCity(u.city ?? '')
        setFullName(u.customerProfile?.fullName ?? '')
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))

    fetch('/api/zones')
      .then(r => r.json())
      .then(data => setZones(data.zones ?? []))
      .catch(() => {})

    loadAddresses()
  }, [router, loadAddresses])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fullName, phone, whatsapp, city }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetDefault(address) {
    const token = localStorage.getItem('wasla_token')
    await fetch(`/api/addresses/${address.id}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isDefault: true }),
    }).catch(() => {})
    loadAddresses()
  }

  async function handleDelete(address) {
    if (!window.confirm(t('address.deleteConfirm', locale))) return
    const token = localStorage.getItem('wasla_token')
    await fetch(`/api/addresses/${address.id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    loadAddresses()
  }

  function handleAddressSaved() {
    setAddressForm(null)
    loadAddresses()
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  function handleToggleLocale() {
    setLocaleCookie(locale === 'ar' ? 'en' : 'ar')
  }

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div className="min-h-screen bg-[#FBF6EF] pb-20" dir={dir}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6">{t('account.title', locale)}</h1>

        {error   && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl px-4 py-3 mb-4">{t('account.saved', locale)}</div>}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100" />)}
          </div>
        ) : (
          <div className="space-y-5">

            {/* Profile */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-black text-gray-900">{t('account.sectionProfile', locale)}</h2>

              <div>
                <label className={labelCls}>{t('account.email', locale)}</label>
                <div className="flex items-center gap-2">
                  <input type="email" value={email} disabled
                    className={`${inputCls} opacity-60 cursor-not-allowed bg-[#FBF6EF]`} />
                  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                    emailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {emailVerified ? t('account.emailVerified', locale) : t('account.emailUnverified', locale)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('account.emailLocked', locale)}</p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelCls}>{t('account.fullName', locale)}</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t('account.phone', locale)}</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('account.whatsapp', locale)}</label>
                    <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="01xxxxxxxxx" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{t('account.city', locale)}</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Cairo" className={inputCls} />
                </div>
                <button type="submit" disabled={saving}
                  className="bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl transition-colors">
                  {saving ? t('account.saving', locale) : t('account.save', locale)}
                </button>
              </form>
            </section>

            {/* Addresses */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-gray-900">{t('account.sectionAddresses', locale)}</h2>
                {addressForm === null && (
                  <button
                    onClick={() => setAddressForm('new')}
                    className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    + {t('account.addAddress', locale)}
                  </button>
                )}
              </div>

              {addressForm !== null ? (
                <AddressForm
                  initial={addressForm === 'new' ? null : addressForm}
                  zones={zones}
                  locale={locale}
                  onSaved={handleAddressSaved}
                  onCancel={() => setAddressForm(null)}
                />
              ) : addresses.length === 0 ? (
                <p className="text-sm text-gray-400">{t('account.noAddresses', locale)}</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map(a => (
                    <AddressCard
                      key={a.id}
                      address={a}
                      locale={locale}
                      onEdit={setAddressForm}
                      onDelete={handleDelete}
                      onSetDefault={handleSetDefault}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Orders */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
              <h2 className="font-black text-gray-900">{t('account.sectionOrders', locale)}</h2>
              <Link href="/orders" className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors">
                {t('account.viewOrders', locale)} →
              </Link>
            </section>

            {/* Preferences */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <h2 className="font-black text-gray-900">{t('account.sectionPrefs', locale)}</h2>
              <button
                onClick={handleToggleLocale}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:bg-[#FBF6EF] transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700">{t('account.language', locale)}</span>
                <span className="text-sm font-bold text-accent-600">{locale === 'ar' ? 'العربية' : 'English'}</span>
              </button>
            </section>

            {/* Account actions */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-900 mb-3">{t('account.sectionActions', locale)}</h2>
              <button
                onClick={handleLogout}
                className="w-full bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-bold py-3 rounded-2xl text-sm transition-all duration-200"
              >
                {t('account.logout', locale)}
              </button>
            </section>

          </div>
        )}
      </div>
    </div>
  )
}
