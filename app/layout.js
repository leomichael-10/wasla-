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
  title:       'Tobaki — UAE Vape Marketplace',
  description: 'Shop disposables, devices, and e-liquids from verified sellers across Dubai, Abu Dhabi and the UAE.',
  keywords:    'vape UAE, disposable vape Dubai, e-liquid Abu Dhabi, vape shop online UAE, buy vape UAE',
  openGraph: {
    title:       'Tobaki — UAE Vape Marketplace',
    description: 'Shop disposables, devices, and e-liquids from verified sellers across the UAE.',
    type:        'website',
    locale:      'en_AE',
    siteName:    'Tobaki',
  },
  robots: {
    index:  true,
    follow: true,
  },
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('tobaki_user_info')?.value
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
                <span className="text-lg font-black text-purple-600">Tobaki</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-400">UAE Vape Marketplace</span>
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
                <Link href="/products"          className="hover:text-purple-600 transition-colors">Products</Link>
                <Link href="/age-verification"  className="hover:text-purple-600 transition-colors">Age Policy</Link>
                <Link href="/terms"             className="hover:text-purple-600 transition-colors">Terms of Service</Link>
                <Link href="/privacy"           className="hover:text-purple-600 transition-colors">Privacy Policy</Link>
              </nav>
              <p className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Tobaki. All rights reserved.
              </p>
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-4">
              For adults 21+ only. Vaping products contain nicotine which is an addictive substance.
            </p>
          </div>
        </footer>
        </UserProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
