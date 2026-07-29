'use client'
import { useState, useEffect } from 'react'
import { getZoneCookie } from '../lib/zone'
import { getLocaleCookie } from '../lib/i18n'

const ZONE_COOKIE_NAME = 'wasla_zone'

export default function ZoneBar() {
  const [zone,   setZone]   = useState(null)
  const [locale, setLocale] = useState('ar')

  useEffect(() => {
    setZone(getZoneCookie())
    setLocale(getLocaleCookie())
  }, [])

  function handleChange() {
    document.cookie = `${ZONE_COOKIE_NAME}=; path=/; max-age=0`
    window.location.reload()
  }

  if (!zone) return null

  const name = locale === 'ar' ? zone.nameAr : zone.nameEn

  return (
    <button
      onClick={handleChange}
      className="w-full bg-brand-800/95 text-white text-xs sm:text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 hover:bg-brand-800 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0 text-accent-300">
        <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM2.5 6a5.5 5.5 0 1 1 9.5 3.774l2.614 2.613a.75.75 0 0 1-1.06 1.06L11 11.061A5.5 5.5 0 0 1 2.5 6Z" clipRule="evenodd" />
      </svg>
      <span>{locale === 'ar' ? `التوصيل إلى ${name}` : `Delivering to ${name}`}</span>
      <span className="underline underline-offset-2 opacity-80">{locale === 'ar' ? 'تغيير' : 'Change'}</span>
    </button>
  )
}
