'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getCartCount } from '../lib/cart'
import { useUser } from '../lib/UserContext'
import { getLocaleCookie, setLocaleCookie, t } from '../lib/i18n'
import MobileMenu from './MobileMenu'

function navLinksFor(user) {
  if (!user) return []
  if (user.role === 'admin') return [
    { href: '/admin', label: 'Admin Panel' },
  ]
  if (user.role === 'customer') return [
    { href: '/',         label: 'Home'      },
    { href: '/shops',    label: 'Shops'     },
    { href: '/products', label: 'Products'  },
    { href: '/orders',   label: 'My Orders' },
  ]
  return [
    { href: '/dashboard',          label: 'Dashboard'   },
    { href: '/dashboard/products', label: 'My Products' },
    { href: '/dashboard/orders',   label: 'My Orders'   },
    { href: '/dashboard/earnings', label: 'Earnings'    },
  ]
}

function guestLinks() {
  return [
    { href: '/',         label: 'Home'     },
    { href: '/shops',    label: 'Shops'    },
    { href: '/products', label: 'Products' },
  ]
}

const isSellerOrAdmin = (user) =>
  user?.role === 'admin' || user?.role === 'retailer' || user?.role === 'wholesaler'

export default function Navbar() {
  const router = useRouter()
  const { user, logout } = useUser()
  const [query,       setQuery]       = useState('')
  const [cartCount,   setCartCount]   = useState(0)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [locale,      setLocale]      = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    const uid = user?.id ?? 'guest'
    setCartCount(getCartCount(uid))
    function syncCart() { setCartCount(getCartCount(user?.id ?? 'guest')) }
    window.addEventListener('cartUpdated', syncCart)
    return () => window.removeEventListener('cartUpdated', syncCart)
  }, [user])

  function handleSearch(e) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : '/products')
    setSearchOpen(false)
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const navLinks   = user ? navLinksFor(user) : guestLinks()
  const showCart   = !user || user.role === 'customer'
  const showBrowse = isSellerOrAdmin(user)
  // Customers/guests get the bottom tab bar (Home/Categories/Cart/Orders/
  // Account) as primary mobile nav — don't duplicate the hamburger + cart
  // icon here for them on small screens. Sellers/admins have no tab bar,
  // so they keep the hamburger drawer.
  const hasMobileTabBar = showCart

  const userInitial = user?.email?.[0]?.toUpperCase() ?? null

  return (
    <>
      <nav className="bg-brand-700 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">

          <button
            className={`${hasMobileTabBar ? 'hidden' : 'lg:hidden'} min-w-11 min-h-11 flex items-center justify-center text-white hover:text-accent-300 transition-colors shrink-0`}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <Link href="/" className="shrink-0 leading-none font-(family-name:--font-reem-kufi)">
            <span className="text-white font-black text-xl tracking-tight">
              was<span className="text-accent-300">la</span>
            </span>
          </Link>

          {navLinks.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 shrink-0">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/90 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
              {showBrowse && (
                <Link
                  href="/browse"
                  className="text-accent-300 hover:text-accent-200 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  View as Customer
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-lg mx-auto">
            <div className="relative w-full">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('nav.search', locale)}
                className="w-full rounded-2xl pl-4 pr-10 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
              />
              <button type="submit" aria-label="Search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 shrink-0 ml-auto lg:ml-0">
            {user ? (
              <>
                {userInitial && (
                  <div className="hidden lg:flex w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-black text-sm items-center justify-center shrink-0">
                    {userInitial}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="hidden lg:block text-white text-sm font-semibold bg-white/20 hover:bg-white/30 active:scale-95 px-3 py-1.5 rounded-full transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login"    className="hidden lg:inline-flex items-center text-white text-sm font-semibold hover:text-accent-300 transition-colors px-2 min-h-11">Sign in</Link>
                <Link href="/register" className="hidden lg:block bg-accent-400 hover:bg-accent-500 active:scale-95 text-gray-900 text-sm font-black px-4 py-1.5 rounded-full transition-all duration-200">Register</Link>
              </>
            )}

            <button
              onClick={() => setLocaleCookie(locale === 'ar' ? 'en' : 'ar')}
              className="text-white/90 hover:text-white text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle language"
            >
              {locale === 'ar' ? 'EN' : 'AR'}
            </button>

            <button
              onClick={() => setSearchOpen(v => !v)}
              className="lg:hidden min-w-11 min-h-11 flex items-center justify-center text-white hover:text-accent-300 transition-colors"
              aria-label="Toggle search"
            >
              {searchOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              )}
            </button>

            {showCart && (
              <Link href="/cart" aria-label="Cart" className={`relative min-w-11 min-h-11 ${hasMobileTabBar ? 'hidden lg:flex' : 'flex'} items-center justify-center text-white hover:text-accent-300 transition-colors`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-accent-400 text-gray-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>

        </div>

        <div className={`lg:hidden overflow-hidden transition-all duration-200 ${searchOpen ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
          <form onSubmit={handleSearch} className="px-4 pb-3">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('nav.search', locale)}
                autoFocus={searchOpen}
                className="w-full rounded-2xl pl-4 pr-10 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
              />
              <button type="submit" aria-label="Search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </nav>

      <MobileMenu
        user={user}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={handleLogout}
      />
    </>
  )
}
