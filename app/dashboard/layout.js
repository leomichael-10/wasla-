'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useUser } from '../../lib/UserContext'

// SVG icon components keyed by route
function NavIcon({ name, className = 'w-4 h-4' }) {
  const paths = {
    overview: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    ),
    products: (
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    ),
    add: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
    orders: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    ),
    pixel: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 0 1 0-5.303m5.304 0a3.75 3.75 0 0 1 0 5.303m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Z" />
    ),
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      {paths[name]}
    </svg>
  )
}

const NAV = [
  { href: '/dashboard',          icon: 'overview',  label: 'Overview'    },
  { href: '/dashboard/catalog',  icon: 'add',       label: 'Browse Catalog' },
  { href: '/dashboard/products', icon: 'products',  label: 'My Products' },
  { href: '/dashboard/orders',   icon: 'orders',    label: 'My Orders'   },
  { href: '/dashboard/pixel',    icon: 'pixel',     label: 'Tracking Pixel' },
]

export default function DashboardLayout({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const [sideOpen, setSideOpen] = useState(false)

  useEffect(() => {
    if (user === undefined) return
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'retailer' && user.role !== 'wholesaler') {
      router.replace('/')
    }
  }, [user, router])

  if (!user || (user.role !== 'retailer' && user.role !== 'wholesaler')) {
    return (
      <div className="min-h-screen bg-[#f9f7ff] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f7ff] flex flex-col">
      <Navbar />

      {/* Mobile sidebar backdrop */}
      {sideOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSideOpen(false)}
        />
      )}

      <div className="flex flex-1 w-full max-w-7xl mx-auto px-4 py-6 gap-6">

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static top-16 bottom-0 left-0 z-50
            w-60 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm
            p-5 flex flex-col transition-transform duration-300 lg:translate-x-0
            ${sideOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Identity */}
          <div className="mb-5 pb-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Seller Dashboard
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{user.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {user.role}
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 space-y-0.5">
            {NAV.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSideOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-[#f9f7ff] hover:text-gray-900'
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Back to store */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-purple-700 font-semibold transition-colors"
            >
              ← Back to store
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSideOpen(true)}
            className="lg:hidden mb-5 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Dashboard Menu
          </button>

          {children}
        </main>

      </div>
    </div>
  )
}
