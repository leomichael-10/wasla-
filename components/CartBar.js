'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getCart, getCartCount, getCartTotal } from '../lib/cart'
import { getLocaleCookie, t } from '../lib/i18n'
import { useUser } from '../lib/UserContext'

const HIDDEN_PREFIXES = ['/cart', '/dashboard', '/admin', '/login', '/register', '/onboarding']

export default function CartBar() {
  const pathname = usePathname()
  const { user }  = useUser()
  const [count,  setCount]  = useState(0)
  const [total,  setTotal]  = useState(0)
  const [locale, setLocale] = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    const uid = user?.id ?? 'guest'
    function sync() {
      setCount(getCartCount(uid))
      setTotal(getCartTotal(uid))
    }
    sync()
    window.addEventListener('cartUpdated', sync)
    return () => window.removeEventListener('cartUpdated', sync)
  }, [user])

  if (HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))) return null
  if (count === 0) return null
  if (user && user.role !== 'customer') return null

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div dir={dir} className="fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pointer-events-none">
      <Link
        href="/cart"
        className="pointer-events-auto max-w-xl mx-auto flex items-center justify-between bg-brand-700 hover:bg-brand-800 active:scale-[0.98] text-white rounded-2xl shadow-2xl px-4 py-3.5 transition-all duration-150"
      >
        <span className="flex items-center gap-2 font-bold text-sm">
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">{count}</span>
          {t('cart.title', locale)}
        </span>
        <span className="font-black text-sm tabular-nums">EGP {total.toFixed(0)}</span>
      </Link>
    </div>
  )
}
