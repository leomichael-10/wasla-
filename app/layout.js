import { Geist, Geist_Mono, Cairo } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { UserProvider } from '../lib/UserContext'
import SessionProviderWrapper from '../components/SessionProviderWrapper'
import AuthSync from '../components/AuthSync'
import GlobalTracker from '../components/GlobalTracker'
import ZoneGate from '../components/ZoneGate'
import PWAInstall from '../components/PWAInstall'
import { DEFAULT_LOCALE, LOCALE_COOKIE, t } from '../lib/i18n'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets:  ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets:  ['latin'],
})

const cairo = Cairo({
  variable: '--font-cairo',
  subsets:  ['arabic', 'latin'],
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
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable:      true,
    statusBarStyle: 'default',
    title:        'Wasla',
  },
  icons: {
    icon:  ['/icons/icon-192.png', '/icons/icon-512.png'],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#7e22ce',
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('wasla_user_info')?.value
  let initialUser = null
  if (raw) {
    try { initialUser = JSON.parse(raw) } catch { /* ignore */ }
  }

  const locale = cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE
  const dir    = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col bg-[#f9f7ff] text-gray-900 ${locale === 'ar' ? 'font-(family-name:--font-cairo)' : ''}`}>
        <SessionProviderWrapper>
        <UserProvider initialUser={initialUser}>
        <AuthSync />
        <GlobalTracker />
        <ZoneGate />
        <PWAInstall />
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
                <span className="text-xs text-gray-400">{t('footer.tagline', locale)}</span>
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
                <Link href="/products"          className="hover:text-purple-600 transition-colors">{t('footer.products', locale)}</Link>
                <Link href="/terms"             className="hover:text-purple-600 transition-colors">{t('footer.terms', locale)}</Link>
                <Link href="/privacy"           className="hover:text-purple-600 transition-colors">{t('footer.privacy', locale)}</Link>
              </nav>
              <p className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Wasla. {t('footer.rights', locale)}.
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
