'use client'
import { useState, useEffect } from 'react'

// Centered loading state for in-app data/page fetches (not the OS/PWA
// splash screen, which iOS only ever renders as a static image anyway).
// Respects prefers-reduced-motion by swapping the animated GIF for its
// first frame, captured once as wasla-splash-static.png.
export default function Loader({ className = '' }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = e => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <div className={`flex items-center justify-center bg-[#FBF6EF] ${className}`}>
      <img
        src={reducedMotion ? '/wasla-splash-static.png' : '/wasla-splash.gif'}
        alt="Wasla"
        width={128}
        height={128}
        className="w-32 h-32"
      />
    </div>
  )
}
