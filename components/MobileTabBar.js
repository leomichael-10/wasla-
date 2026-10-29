'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useUser } from '../lib/UserContext'
import { getCartCount } from '../lib/cart'
import { getLocaleCookie, t } from '../lib/i18n'

const HIDDEN_PREFIXES = ['/dashboard', '/admin', '/login', '/register', '/onboarding', '/forgot-password', '/reset-password', '/verify-email', '/auth']

function TabIcon({ name, active, size = 'w-6 h-6' }) {
  // 100+/day interaction (bottom-nav taps) — only a near-imperceptible color
  // fade, never a transform/scale, per the frequency gate.
  const cls = `${size} transition-colors duration-120 ${active ? 'text-wasla-orange' : 'text-gray-400'}`
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

export default function MobileTabBar() {
  const pathname = usePathname()
  const { user } = useUser()
  const [cartCount, setCartCount] = useState(0)
  const [locale,    setLocale]    = useState('ar')

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

  const tabs = [
    { key: 'cart',       href: '/cart',       labelKey: 'tab.cart',       icon: 'cart',       badge: cartCount },
    { key: 'categories', href: '/categories', labelKey: 'tab.categories', icon: 'categories' },
    { key: 'home',       href: '/',           labelKey: 'tab.home',       icon: 'home',       center: true },
    { key: 'orders',     href: '/orders',     labelKey: 'tab.orders',     icon: 'orders' },
    { key: 'account',    href: '/account',    labelKey: 'tab.account',    icon: 'account', match: ['/account', '/profile'] },
  ]

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <nav
      dir={dir}
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(120,65,30,0.12)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map(tab => {
          const active = tab.href === '/'
            ? pathname === '/'
            : (tab.match ?? [tab.href]).some(p => pathname?.startsWith(p))
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 focus-visible:bg-brand-50 transition-colors ${tab.center ? '-translate-y-2' : ''}`}
            >
              <span className="relative">
                <TabIcon name={tab.icon} active={active} size={tab.center ? 'w-7 h-7' : 'w-6 h-6'} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -end-2 min-w-4 h-4 px-1 bg-wasla-orange text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-bold transition-colors duration-120 ${active ? 'text-wasla-orange' : 'text-gray-400'}`}>
                {t(tab.labelKey, locale)}
              </span>
              <span className={`block h-[2px] w-4 rounded-full transition-colors duration-120 ${active ? 'bg-wasla-orange' : 'bg-transparent'}`} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
