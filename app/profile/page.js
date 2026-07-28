'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'

export default function ProfilePage() {
  const router = useRouter()

  const [fullName,         setFullName]         = useState('')
  const [phone,            setPhone]            = useState('')
  const [whatsapp,         setWhatsapp]         = useState('')
  const [city,             setCity]             = useState('')
  const [gender,           setGender]           = useState('')
  const [deliveryAddress,  setDeliveryAddress]  = useState('')
  const [email,            setEmail]            = useState('')

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

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
        setPhone(u.phone ?? '')
        setWhatsapp(u.whatsapp ?? '')
        setCity(u.city ?? '')
        setGender(u.gender ?? '')
        setFullName(u.customerProfile?.fullName ?? '')
        setDeliveryAddress(u.customerProfile?.deliveryAddress ?? '')
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [router])

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
        body:    JSON.stringify({ fullName, phone, whatsapp, city, gender, deliveryAddress }),
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

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition bg-white'
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6">My Profile</h1>

        {error   && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl px-4 py-3 mb-4">Profile saved successfully.</div>}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100" />)}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">

            {/* Account info (read-only) */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-black text-gray-900 mb-4">Account</h2>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={email} disabled
                  className={`${inputCls} opacity-60 cursor-not-allowed bg-[#f9f7ff]`} />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
              </div>
            </section>

            {/* Personal info */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-black text-gray-900">Personal Information</h2>
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className={inputCls} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 000 0000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+971 50 000 0000" className={inputCls} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Cairo" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Delivery */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-black text-gray-900">Default Delivery Address</h2>
              <textarea
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Building 12, Street 5, Faisal, Cairo"
                rows={3}
                className={`${inputCls} resize-none`}
              />
              <p className="text-xs text-gray-400">This will be pre-filled at checkout.</p>
            </section>

            <div className="pb-6">
              <button type="submit" disabled={saving}
                className="bg-purple-700 hover:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl transition-colors">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
