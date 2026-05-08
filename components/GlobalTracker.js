'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function GlobalTracker() {
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/track/global', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ page: pathname, referrer: document.referrer || null }),
    }).catch(() => {})
  }, [pathname])

  return null
}
