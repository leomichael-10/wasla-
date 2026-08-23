'use client'
import { createContext, useContext } from 'react'
import { DEFAULT_LOCALE } from './i18n'

// Seeded server-side from the cookie in app/layout.js (same pattern as
// UserContext's initialUser) so client components render the right locale
// on their very first paint — no SSR-defaults-to-'ar'-then-flashes-to-'en'
// gap like the per-component `useState('ar') + useEffect(getLocaleCookie)`
// pattern still used elsewhere in this app has.
const LocaleContext = createContext(null)

export function LocaleProvider({ initialLocale, children }) {
  return (
    <LocaleContext.Provider value={{ locale: initialLocale ?? DEFAULT_LOCALE }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext) ?? { locale: DEFAULT_LOCALE }
}
