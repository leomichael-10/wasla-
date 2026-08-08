'use client'
import { useState, useEffect } from 'react'

const SPLASH_SEEN_KEY = 'wasla_splash_seen_v1'
const AUTO_DISMISS_MS = 2400

// Full-screen first-open splash — cream background covering the entire
// viewport edge to edge (100dvh/100vw, no gaps, nothing visible behind
// it), the rider mark filling the screen via object-fit: cover (the
// source is 404x370, near-square, so on a tall phone it's scaled up and
// center-cropped horizontally rather than left small and centered).
//
// Visibility on first paint is decided by a blocking inline script in
// app/layout.js's <head> (sets `data-splash-seen` on <html> before
// <body> ever paints) + the CSS in app/globals.css, NOT by this
// component's React state — see the comments in both of those for why:
// state set in an effect only takes effect after the first paint, which
// flashes the wrong thing for one of the two cases (new vs. returning
// visitor) every time. This component still always renders the markup
// (no conditional return null) so the pre-paint CSS attribute has
// something to hide/show; React only owns what happens AFTER mount —
// the auto-dismiss timer, tap-to-skip, and the reduced-motion swap.
export default function SplashScreen() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = e => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)

    // The inline head script already set this before we ever mounted —
    // if it says "seen", there's nothing left for this effect to do.
    const alreadySeen = document.documentElement.getAttribute('data-splash-seen') === '1'
    let timer
    if (!alreadySeen) {
      timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    }

    return () => {
      query.removeEventListener('change', onChange)
      clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    try { localStorage.setItem(SPLASH_SEEN_KEY, '1') } catch { /* ignore */ }
    // Same attribute the inline script drives — flipping it here is what
    // actually hides the overlay (via the CSS rule), not React state.
    document.documentElement.setAttribute('data-splash-seen', '1')
  }

  return (
    <div
      id="wasla-splash"
      onClick={dismiss}
      role="button"
      aria-label="Skip"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') dismiss() }}
    >
      <img
        src={reducedMotion ? '/wasla-splash-static.png' : '/wasla-splash.gif'}
        alt="Wasla — وصلة"
        className="select-none pointer-events-none"
        draggable={false}
      />
    </div>
  )
}
