import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { UserProvider } from '../lib/UserContext'
import SessionProviderWrapper from '../components/SessionProviderWrapper'
import AuthSync from '../components/AuthSync'
import GlobalTracker from '../components/GlobalTracker'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets:  ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets:  ['latin'],
})

export const metadata = {
  title:       'Wasla (وصلة) — Sudanese Products, Delivered in Cairo',
  description: 'Shop Sudanese food, spices, coffee, and heritage goods from verified Sudanese shops across Cairo and Giza — منتجات سودانية توصلك.',
  keywords:    'Sudanese products Cairo, Sudanese food Egypt, بن كسلا, كركديه, بهارات سودانية, shop Sudanese Cairo',
  openGraph: {
    title:       'Wasla (وصلة) — Sudanese Products, Delivered in Cairo',
    description: 'Shop Sudanese food, spices, coffee, and heritage goods from verified Sudanese shops across Cairo and Giza.',
    type:        'website',
    locale:      'ar_EG',
    siteName:    'Wasla',
  },
  robots: {
    index:  true,
    follow: true,
  },
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('wasla_user_info')?.value
  let initialUser = null
  if (raw) {
    try { initialUser = JSON.parse(raw) } catch { /* ignore */ }
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f9f7ff] text-gray-900">
        <SessionProviderWrapper>
        <UserProvider initialUser={initialUser}>
        <AuthSync />
        <GlobalTracker />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontWeight:   '600',
              fontSize:     '14px',
            },
            success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
            error:   { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
          }}
        />
        <main className="flex-1">{children}</main>
        <footer className="bg-white border-t border-gray-100 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-purple-600">Wasla</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-400">منتجات سودانية توصلك</span>
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
                <Link href="/products"          className="hover:text-purple-600 transition-colors">Products</Link>
                <Link href="/terms"             className="hover:text-purple-600 transition-colors">Terms of Service</Link>
                <Link href="/privacy"           className="hover:text-purple-600 transition-colors">Privacy Policy</Link>
              </nav>
              <p className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Wasla. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
        </UserProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
