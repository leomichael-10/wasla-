'use client'
import Link from 'next/link'

function navLinksFor(user) {
  if (!user) return [
    { href: '/',         label: 'Home'     },
    { href: '/shops',    label: 'Shops'    },
    { href: '/products', label: 'Products' },
  ]
  if (user.role === 'admin') return [
    { href: '/admin', label: 'Admin Panel' },
  ]
  if (user.role === 'customer') return [
    { href: '/',          label: 'Home'      },
    { href: '/shops',     label: 'Shops'     },
    { href: '/products',  label: 'Products'  },
    { href: '/orders',    label: 'My Orders' },
    { href: '/wishlist',  label: 'Wishlist'  },
    { href: '/profile',   label: 'My Profile'},
  ]
  return [
    { href: '/dashboard',          label: 'Dashboard'   },
    { href: '/dashboard/products', label: 'My Products' },
    { href: '/dashboard/orders',   label: 'My Orders'   },
    { href: '/dashboard/earnings', label: 'Earnings'    },
  ]
}

export default function MobileMenu({ user, isOpen, onClose, onLogout }) {
  const navLinks   = navLinksFor(user)
  const showBrowse = user?.role === 'admin' || user?.role === 'retailer' || user?.role === 'wholesaler'

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl lg:hidden flex flex-col transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center justify-between px-5 py-4 bg-purple-700">
          <span className="text-white font-black text-xl tracking-tight">
            toba<span className="text-amber-300">ki</span>
          </span>
          <button
            onClick={onClose}
            className="min-w-11 min-h-11 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {user && (
          <div className="px-5 py-3 bg-purple-50 border-b border-purple-100">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">{user.role}</p>
            <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{user.email}</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors border-l-4 border-transparent hover:border-purple-200 min-h-11"
            >
              {link.label}
            </Link>
          ))}
          {showBrowse && (
            <Link
              href="/browse"
              onClick={onClose}
              className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors border-l-4 border-transparent hover:border-amber-200 min-h-11"
            >
              View as Customer
            </Link>
          )}
        </nav>

        <div className="px-5 py-4 border-t border-gray-100">
          {user ? (
            <button
              onClick={() => { onLogout(); onClose() }}
              className="w-full bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-bold py-3 rounded-2xl text-sm transition-all duration-200 min-h-11"
            >
              Sign out
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex-1 text-center border border-purple-400 text-purple-600 font-bold py-3 rounded-2xl text-sm hover:bg-purple-50 active:scale-95 transition-all duration-200 min-h-11 flex items-center justify-center"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="flex-1 text-center bg-amber-400 hover:bg-amber-500 active:scale-95 text-gray-900 font-black py-3 rounded-2xl text-sm transition-all duration-200 min-h-11 flex items-center justify-center"
              >
                Register
              </Link>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
