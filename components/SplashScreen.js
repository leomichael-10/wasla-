'use client'
import { useState, useEffect } from 'react'

const SPLASH_SEEN_KEY = 'wasla_splash_seen_v1'
const AUTO_DISMISS_MS = 2400

// Full-screen first-open splash — cream background covering the entire
// viewport (no page visible behind it), the rider mark spanning the
// full screen width without stretching/cropping (width: 100%, height
// auto, so its native aspect ratio holds — no object-fit tricks
// needed since only width is constrained). The mark itself already
// bakes in the وصلة/WASLA wordmark + tagline, so there's no separate
// logo bar underneath it. Shown once ever per browser (localStorage
// flag), never re-appears on reload/navigation within the same app
// shell. Auto-dismisses; tap anywhere skips it immediately.
export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    let seen = true
    try { seen = localStorage.getItem(SPLASH_SEEN_KEY) === '1' } catch { /* ignore */ }
    if (!seen) setVisible(true)

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = e => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  function dismiss() {
    try { localStorage.setItem(SPLASH_SEEN_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      onClick={dismiss}
      role="button"
      aria-label="Skip"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') dismiss() }}
      className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#F3EDE2] cursor-pointer"
      style={{
        paddingTop:    'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft:   'env(safe-area-inset-left)',
        paddingRight:  'env(safe-area-inset-right)',
      }}
    >
      <img
        src={reducedMotion ? '/wasla-splash-static.png' : '/wasla-splash.gif'}
        alt="Wasla — وصلة"
        className="w-full h-auto select-none pointer-events-none"
        draggable={false}
      />
    </div>
  )
}
