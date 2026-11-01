'use client'
import { useRouter } from 'next/navigation'
import { setLocaleCookie } from '../lib/i18n'

// Shared AR/EN switch — used by Navbar (desktop) and HomeHeader (mobile),
// so the two can't drift apart. A globe pictogram, not a bare two-letter
// button: the two-letter-only version is exactly what made the toggle a
// "mystery button" invisible on mobile until this component existed.
export default function LocaleToggle({ locale, variant = 'light' }) {
  const router = useRouter()
  const target = locale === 'ar' ? 'EN' : 'AR'
  const tone = variant === 'light'
    ? 'bg-wasla-card text-brand-700 border border-brand-900/10'
    : 'text-white/90 hover:text-white hover:bg-white/10'

  function handleToggle() {
    setLocaleCookie(locale === 'ar' ? 'en' : 'ar')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={`relative flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-colors ${tone}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="8.25" />
        <path strokeLinecap="round" d="M12 3.75c2.4 2.4 3.6 5.2 3.6 8.25s-1.2 5.85-3.6 8.25c-2.4-2.4-3.6-5.2-3.6-8.25S9.6 6.15 12 3.75Z" />
        <path strokeLinecap="round" d="M4.2 9.75h15.6M4.2 14.25h15.6" />
      </svg>
      <span className="absolute -bottom-1 -end-1 bg-wasla-orange text-white text-[9px] font-black leading-none rounded-full px-1 py-0.5 shadow-sm">
        {target}
      </span>
    </button>
  )
}
