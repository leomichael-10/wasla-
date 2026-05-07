'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getCartCount } from '../lib/cart'
import { useUser } from '../lib/UserContext'
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
    { href: '/wishlist', label: 'Wishlist'  },
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
  const [query,     setQuery]     = useState('')
  const [cartCount, setCartCount] = useState(0)
  const [menuOpen,  setMenuOpen]  = useState(false)

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
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const navLinks   = user ? navLinksFor(user) : guestLinks()
  const showCart   = !user || user.role === 'customer'
  const showBrowse = isSellerOrAdmin(user)

  return (
    <>
      <nav className="bg-teal-400 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">

          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden text-white hover:text-yellow-300 transition-colors shrink-0"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/" className="shrink-0 leading-none">
            <span className="text-white font-black text-xl tracking-tight">
              toba<span className="text-yellow-300">ki</span>
            </span>
          </Link>

          {/* Role-based nav links — desktop only */}
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
                  className="text-yellow-300 hover:text-yellow-200 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  View as Customer
                </Link>
              )}
            </div>
          )}

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-auto">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products, brands, flavors..."
                className="w-full rounded-full pl-4 pr-10 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button type="submit" aria-label="Search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-500 hover:text-teal-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Right actions — desktop */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <span className="hidden sm:block text-white text-sm font-medium truncate max-w-32">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="hidden sm:block text-white text-sm font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login"    className="hidden sm:block text-white text-sm font-semibold hover:text-yellow-300 transition-colors">Sign in</Link>
                <Link href="/register" className="hidden sm:block bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-black px-4 py-1.5 rounded-full transition-colors">Register</Link>
              </>
            )}

            {/* Cart */}
            {showCart && (
              <Link href="/cart" aria-label="Cart" className="relative text-white hover:text-yellow-300 transition-colors ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-gray-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              </Link>
            )}
          </div>

        </div>
      </nav>

      {/* Mobile slide-in menu */}
      <MobileMenu
        user={user}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={handleLogout}
      />
    </>
  )
}
