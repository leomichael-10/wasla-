'use client'
import { useState, useEffect } from 'react'
import { categoryImageSrc } from '../lib/categoryIcons'
import { categoryName } from '../lib/i18n'

// Neutral placeholder — shown when a category has no mapped illustration,
// or the mapped file 404s. Never a broken-image icon.
function FallbackIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 7ZM8 7V5a4 4 0 0 1 8 0v2" />
    </svg>
  )
}

// Renders the colorful illustrated category icon (public/categories/), keyed
// by the category's real DB icon slug via lib/categoryIcons.js — the single
// source of truth for slug → image. Falls back to a neutral line-art
// placeholder if the slug is unmapped or the file fails to load, and logs
// which category is missing its asset either way.
export default function CategoryIcon({ slug, name, locale = 'ar', className = 'w-7 h-7' }) {
  const [failed, setFailed] = useState(false)
  const src = categoryImageSrc(slug)

  useEffect(() => {
    if (!src) {
      console.warn(`[CategoryIcon] no illustrated asset mapped for category icon slug "${slug}"`)
      setFailed(false) // nothing to fail — the "no mapping" branch renders the fallback directly
      return
    }
    // A plain <img>'s onError prop can race hydration: the `error` event on
    // img/media elements does not bubble, and if the (often near-instant,
    // same-host) 404 resolves before React attaches its listener to this
    // exact node, the failure is silently lost. Probing with a fresh
    // Image() inside an effect guarantees the check runs post-hydration.
    let cancelled = false
    const probe = new window.Image()
    probe.onload  = () => { if (!cancelled) setFailed(false) }
    probe.onerror = () => {
      if (cancelled) return
      console.warn(`[CategoryIcon] failed to load illustrated asset "${src}" for slug "${slug}"`)
      setFailed(true)
    }
    probe.src = src
    return () => { cancelled = true }
  }, [slug, src])

  const alt = name ? categoryName(name, locale) : ''

  if (!src || failed) {
    return <FallbackIcon className={className} />
  }

  return <img src={src} alt={alt} className={`${className} object-contain`} />
}
