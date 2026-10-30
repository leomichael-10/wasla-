'use client'
import { useState, useEffect } from 'react'
import { JABANA_PATHS } from './WaslaMark'
import Wordmark from './Wordmark'

// The brand mark drawing itself — shared by SplashScreen (variant="splash",
// plays once) and Loader (variant="loader", loops as an indeterminate
// progress cue). Reduced motion gets the fully-drawn mark with no
// animation classes at all, not just a fast one — see the comment in
// app/globals.css for why that's a second line of defense, not the first.
export default function WaslaLogo({ variant = 'splash', className = '' }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = e => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const loop = variant === 'loader'
  const markSizeClass = variant === 'loader' ? 'w-16 h-16' : 'w-36 h-36'
  const wordmarkSizeClass = variant === 'loader' ? 'text-sm' : 'text-2xl'
  const pathClass = reducedMotion ? '' : (loop ? 'wasla-mark-loop' : 'wasla-mark-draw')
  const dotClass = reducedMotion ? '' : (loop ? 'wasla-mark-loop-fill' : 'wasla-mark-fill')

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${markSizeClass} text-wasla-orange-deep`}
        aria-hidden="true"
      >
        {JABANA_PATHS.map((d, i) => (
          <path key={i} d={d} className={pathClass} style={reducedMotion ? undefined : { animationDelay: `${i * 0.3}s` }} />
        ))}
        <circle cx="100" cy="44" r="5" fill="currentColor" stroke="none" className={dotClass} style={reducedMotion ? undefined : { animationDelay: '0.9s' }} />
      </svg>
      <div className={`font-black ${wordmarkSizeClass} text-wasla-orange-deep font-(family-name:--font-reem-kufi) ${reducedMotion ? '' : 'wasla-wordmark-in'}`} style={reducedMotion || loop ? undefined : { animationDelay: '1.8s' }}>
        <bdi><Wordmark accentClassName="text-wasla-orange" /></bdi>
      </div>
    </div>
  )
}
