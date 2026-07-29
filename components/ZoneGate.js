'use client'
import { useEffect, useState, useCallback } from 'react'
import { getZoneCookie, setZoneCookie } from '../lib/zone'
import { getLocaleCookie, t } from '../lib/i18n'

// Explicit, mutually-exclusive views — never two of these mounted at once.
// 'loading' | 'zones' | 'error' | 'waitlist-thanks'
export default function ZoneGate() {
  const [open,    setOpen]    = useState(false)
  const [view,    setView]    = useState('loading')
  const [zones,   setZones]   = useState([])
  const [waitlistDistrict, setWaitlistDistrict] = useState('')
  const [locale,           setLocale]           = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  const loadZones = useCallback(() => {
    setView('loading')
    fetch('/api/zones')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load zones')
        return r.json()
      })
      .then(data => {
        setZones(data.zones ?? [])
        setView('zones')
      })
      .catch(() => setView('error'))
  }, [])

  useEffect(() => {
    if (getZoneCookie()) return
    setOpen(true)
    loadZones()
  }, [loadZones])

  function handleSelect(zone) {
    setZoneCookie(zone)
    setOpen(false)
  }

  function handleSkip() {
    setOpen(false)
  }

  async function handleWaitlist(e) {
    e.preventDefault()
    if (!waitlistDistrict.trim()) return
    try {
      await fetch('/api/waitlist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ district: waitlistDistrict.trim() }),
      })
      setView('waitlist-thanks')
    } catch { /* stays on the form; the user can retry */ }
  }

  if (!open) return null

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div dir={dir} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">

        <button
          onClick={handleSkip}
          aria-label="Close"
          className="absolute top-4 inset-e-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-black text-gray-900 pe-8">{t('zone.title', locale)}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('zone.subtitle', locale)}</p>

        {view === 'loading' && (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {view === 'error' && (
          <div className="mt-6 text-center py-6">
            <p className="text-sm text-gray-500 mb-3">
              {locale === 'ar' ? 'تعذر تحميل المناطق. حاول مرة أخرى.' : "Couldn't load delivery areas."}
            </p>
            <button
              onClick={loadZones}
              className="text-sm font-bold bg-brand-700 hover:bg-brand-800 text-white px-5 py-2 rounded-xl transition-colors"
            >
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {view === 'zones' && (
          <div className="mt-5 space-y-2">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => handleSelect(zone)}
                className="w-full text-start border border-gray-200 hover:border-brand-400 hover:bg-[#FBF6EF] rounded-2xl px-4 py-3 transition-colors flex items-center justify-between"
              >
                <span>
                  <span className="font-bold text-gray-900 text-sm">
                    {locale === 'ar' ? zone.nameAr : zone.nameEn}
                  </span>
                  <span className="text-gray-400 text-xs ms-2">
                    {locale === 'ar' ? zone.nameEn : zone.nameAr}
                  </span>
                </span>
                <span className="text-xs text-gray-400 shrink-0">~{zone.etaMinutes}m</span>
              </button>
            ))}
          </div>
        )}

        {view === 'waitlist-thanks' ? (
          <div className="mt-6 border-t border-gray-100 pt-4 text-center">
            <p className="text-sm text-green-600 font-semibold">
              {locale === 'ar' ? 'شكرًا — هنبلغك أول ما نوصل لمنطقتك.' : "Thanks — we'll let you know when we launch in your area."}
            </p>
          </div>
        ) : (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-2">
              {locale === 'ar' ? 'منطقتك مش موجودة؟ انضم لقائمة الانتظار.' : "Don't see your area? Join the waitlist."}
            </p>
            <form onSubmit={handleWaitlist} className="flex gap-2">
              <input
                type="text"
                value={waitlistDistrict}
                onChange={e => setWaitlistDistrict(e.target.value)}
                placeholder={locale === 'ar' ? 'منطقتك' : 'Your area'}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                type="submit"
                className="bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600 text-xs font-bold px-4 rounded-xl transition-colors shrink-0"
              >
                {locale === 'ar' ? 'أبلغني' : 'Notify me'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
