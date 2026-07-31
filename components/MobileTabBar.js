'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useUser } from '../lib/UserContext'
import { getCartCount } from '../lib/cart'
import { getLocaleCookie, setLocaleCookie, t } from '../lib/i18n'
import { onPromptAvailable, triggerInstall, isStandalone, isIos } from '../lib/pwaInstall'

// Label for the second tab lives in one place — see the note in the task
// this shipped from: this may become "Shops"/"Brands" if the catalog
// broadens beyond Sudanese-first. Change CATEGORIES_TAB here only.
const CATEGORIES_TAB = { hrefKey: '/products', labelKey: 'tab.categories' }

const HIDDEN_PREFIXES = ['/dashboard', '/admin', '/login', '/register', '/onboarding']

function TabIcon({ name, active }) {
  // 100+/day interaction (bottom-nav taps) — only a near-imperceptible color
  // fade, never a transform/scale, per the frequency gate.
  const cls = `w-6 h-6 transition-colors duration-120 ${active ? 'text-accent-500' : 'text-brand-400'}`
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 0 1 2.122 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />,
    categories: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />,
    cart: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />,
    orders: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />,
    account: <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.964 0a9 9 0 1 0-11.964 0m11.964 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className={cls}>
      {icons[name]}
    </svg>
  )
}

function AccountSheet({ open, onClose, user, onLogout, locale, setLocale }) {
  const [installState, setInstallState] = useState('none') // 'none' | 'available' | 'ios'

  useEffect(() => {
    if (isStandalone()) return
    if (isIos()) { setInstallState('ios'); return }
    return onPromptAvailable(() => setInstallState('available'))
  }, [])

  async function handleInstall() {
    if (installState === 'available') await triggerInstall()
  }

  function handleToggleLocale() {
    const next = locale === 'ar' ? 'en' : 'ar'
    setLocaleCookie(next)
    setLocale(next)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />

        {user ? (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="font-black text-brand-900 text-sm truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {user.role}
            </span>
          </div>
        ) : (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <Link
              href="/login"
              onClick={onClose}
              className="block text-center bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              {t('nav.login', locale)}
            </Link>
          </div>
        )}

        <div className="space-y-1">
          {user && (
            <Link href="/profile" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-brand-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5 text-brand-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.964 0a9 9 0 1 0-11.964 0m11.964 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span className="text-sm font-semibold text-brand-900">{t('account.profile', locale)}</span>
            </Link>
          )}

          {user && (
            <Link href="/profile" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-brand-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5 text-brand-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span className="text-sm font-semibold text-brand-900">{t('account.addresses', locale)}</span>
            </Link>
          )}

          <button onClick={handleToggleLocale} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-brand-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5 text-brand-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
            </svg>
            <span className="text-sm font-semibold text-brand-900">{t('account.language', locale)}</span>
            <span className="ms-auto text-xs font-bold text-accent-500">{locale === 'ar' ? 'EN' : 'AR'}</span>
          </button>

          {installState !== 'none' && (
            <button onClick={handleInstall} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-brand-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5 text-brand-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V4m0 12.5 4-4m-4 4-4-4M4 17.5v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              <span className="text-sm font-semibold text-brand-900">{t('account.install', locale)}</span>
            </button>
          )}

          {user && (
            <button onClick={() => { onLogout(); onClose() }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hibiscus-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5 text-hibiscus-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              <span className="text-sm font-semibold text-hibiscus-500">{t('account.logout', locale)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MobileTabBar() {
  const pathname = usePathname()
  const router    = useRouter()
  const { user, logout } = useUser()
  const [cartCount, setCartCount] = useState(0)
  const [locale,    setLocale]    = useState('ar')
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    const uid = user?.id ?? 'guest'
    function sync() { setCartCount(getCartCount(uid)) }
    sync()
    window.addEventListener('cartUpdated', sync)
    return () => window.removeEventListener('cartUpdated', sync)
  }, [user])

  if (HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))) return null
  if (user && user.role !== 'customer') return null

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const tabs = [
    { key: 'home',       href: '/',                labelKey: 'tab.home',    icon: 'home' },
    { key: 'categories', href: CATEGORIES_TAB.hrefKey, labelKey: CATEGORIES_TAB.labelKey, icon: 'categories' },
    { key: 'cart',       href: '/cart',            labelKey: 'tab.cart',    icon: 'cart', badge: cartCount },
    { key: 'orders',     href: '/orders',          labelKey: 'tab.orders',  icon: 'orders' },
  ]

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <>
      <nav
        dir={dir}
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white border-t border-brand-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          {tabs.map(tab => {
            const active = tab.href === '/' ? pathname === '/' : pathname?.startsWith(tab.href)
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="relative flex flex-col items-center justify-center gap-0.5 focus-visible:bg-brand-50 transition-colors"
              >
                <span className="relative">
                  <TabIcon name={tab.icon} active={active} />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -end-2 min-w-4 h-4 px-1 bg-accent-400 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-bold transition-colors duration-120 ${active ? 'text-accent-500' : 'text-brand-400'}`}>
                  {t(tab.labelKey, locale)}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setSheetOpen(true)}
            className="relative flex flex-col items-center justify-center gap-0.5 focus-visible:bg-brand-50 transition-colors"
            aria-label={t('tab.account', locale)}
          >
            <TabIcon name="account" active={sheetOpen} />
            <span className={`text-[10px] font-bold transition-colors duration-120 ${sheetOpen ? 'text-accent-500' : 'text-brand-400'}`}>
              {t('tab.account', locale)}
            </span>
          </button>
        </div>
      </nav>

      <AccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        user={user}
        onLogout={handleLogout}
        locale={locale}
        setLocale={setLocale}
      />
    </>
  )
}
