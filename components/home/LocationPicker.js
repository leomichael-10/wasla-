'use client'
import { useState, useEffect } from 'react'
import { getZoneCookie } from '../../lib/zone'
import { placeName } from '../../lib/i18n'

const ZONE_COOKIE_NAME = 'wasla_zone'

export default function LocationPicker({ locale }) {
  const [zone, setZone] = useState(null)

  useEffect(() => { setZone(getZoneCookie()) }, [])

  function handleChange() {
    document.cookie = `${ZONE_COOKIE_NAME}=; path=/; max-age=0`
    window.location.reload()
  }

  const name = zone ? (locale === 'ar' ? zone.nameAr : zone.nameEn) : placeName('Cairo', locale)

  return (
    <button
      type="button"
      onClick={handleChange}
      className="flex items-center gap-1 h-11 px-3 rounded-full bg-wasla-card border border-brand-900/10 shrink-0 text-xs font-bold text-wasla-orange-deep"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      <bdi>{name}</bdi>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 rtl:-scale-x-100">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  )
}
