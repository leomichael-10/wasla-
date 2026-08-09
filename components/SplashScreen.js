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
// The critical sizing/positioning (fixed, inset 0, 100dvh/100vw,
// z-index, background, object-fit) is set as INLINE styles here rather
// than through app/globals.css's #wasla-splash rule (which still only
// carries the one thing that has to react to an attribute change —
// html[data-splash-seen="1"] #wasla-splash { display:none }). Inline
// styles are part of the server-rendered HTML itself and win over any
// external stylesheet regardless of load timing or cascade — this is
// the fix for a full-bleed-instead-of-corner-square regression that
// couldn't be reproduced in automated testing (position:fixed and the
// full 390x844 box both measured correctly here), but pinning the
// must-never-be-wrong properties inline removes that whole class of
// "the stylesheet hadn't applied yet" risk regardless of root cause.
//
// Visibility on first paint is decided by a blocking inline script in
// app/layout.js's <head> (sets `data-splash-seen` on <html> before
// <body> ever paints), NOT by this component's React state — see the
// comments there for why: state set in an effect only takes effect
// after the first paint, which flashes the wrong thing for one of the
// two cases (new vs. returning visitor) every time. This component
// always renders the markup (no conditional return null) so the
// pre-paint CSS attribute has something to hide/show; React only owns
// what happens AFTER mount — the auto-dismiss timer, tap-to-skip, the
// reduced-motion swap, and locking body scroll while it's up.
// No `display` here on purpose — it needs to react to the
// `data-splash-seen` attribute (see app/globals.css), and inline styles
// always beat external-stylesheet rules regardless of specificity, so
// setting `display` inline would make that CSS override permanently
// unable to hide this element. Leaving it unset lets the div's default
// `display: block` stand as the (uncontested) base state, with
// app/globals.css's `html[data-splash-seen="1"] #wasla-splash` rule
// free to switch it to `none`.
const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100dvh',
  zIndex: 100,
  background: '#F3EDE2',
  cursor: 'pointer',
}

const IMG_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
}

export default function SplashScreen() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = e => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)

    // The inline head script already set this before we ever mounted —
    // if it says "seen", there's nothing left for this effect to do
    // (no timer, no scroll lock).
    const alreadySeen = document.documentElement.getAttribute('data-splash-seen') === '1'
    let timer
    if (!alreadySeen) {
      lockBodyScroll()
      timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    }

    return () => {
      query.removeEventListener('change', onChange)
      clearTimeout(timer)
    }
  }, [])

  function lockBodyScroll() {
    document.body.style.overflow = 'hidden'
  }

  function unlockBodyScroll() {
    document.body.style.overflow = ''
  }

  function dismiss() {
    try { localStorage.setItem(SPLASH_SEEN_KEY, '1') } catch { /* ignore */ }
    // Same attribute the inline script drives — flipping it here is what
    // actually hides the overlay (via the CSS rule in app/globals.css),
    // not React state.
    document.documentElement.setAttribute('data-splash-seen', '1')
    unlockBodyScroll()
  }

  return (
    <div
      id="wasla-splash"
      onClick={dismiss}
      role="button"
      aria-label="Skip"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') dismiss() }}
      style={OVERLAY_STYLE}
    >
      <img
        src={reducedMotion ? '/wasla-splash-static.png' : '/wasla-splash.gif'}
        alt="Wasla — وصلة"
        className="select-none pointer-events-none"
        style={IMG_STYLE}
        draggable={false}
      />
    </div>
  )
}
