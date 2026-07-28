'use client'
import { useEffect, useState } from 'react'
import { getZoneCookie, setZoneCookie } from '../lib/zone'
import { getLocaleCookie, t } from '../lib/i18n'

export default function ZoneGate() {
  const [open,    setOpen]    = useState(false)
  const [zones,   setZones]   = useState([])
  const [loading, setLoading] = useState(true)
  const [waitlistDistrict, setWaitlistDistrict] = useState('')
  const [waitlistDone,     setWaitlistDone]     = useState(false)
  const [locale,           setLocale]           = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    if (getZoneCookie()) return
    setOpen(true)
    fetch('/api/zones')
      .then(r => r.json())
      .then(data => setZones(data.zones ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSelect(zone) {
    setZoneCookie(zone)
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
      setWaitlistDone(true)
    } catch { /* ignore */ }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-black text-gray-900">{t('zone.title', locale)}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('zone.subtitle', locale)}</p>

        {loading ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => handleSelect(zone)}
                className="w-full text-left border border-gray-200 hover:border-purple-400 hover:bg-[#f9f7ff] rounded-2xl px-4 py-3 transition-colors flex items-center justify-between"
              >
                <span>
                  <span className="font-bold text-gray-900 text-sm">{zone.nameEn}</span>
                  <span className="text-gray-400 text-xs ml-2">{zone.nameAr}</span>
                </span>
                <span className="text-xs text-gray-400">~{zone.etaMinutes}m</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          {waitlistDone ? (
            <p className="text-sm text-green-600 font-semibold text-center">Thanks — we'll let you know when we launch in your area.</p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-2">Don't see your area? Join the waitlist.</p>
              <form onSubmit={handleWaitlist} className="flex gap-2">
                <input
                  type="text"
                  value={waitlistDistrict}
                  onChange={e => setWaitlistDistrict(e.target.value)}
                  placeholder="Your area"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="submit"
                  className="bg-gray-100 hover:bg-purple-50 hover:text-purple-700 text-gray-600 text-xs font-bold px-4 rounded-xl transition-colors"
                >
                  Notify me
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
