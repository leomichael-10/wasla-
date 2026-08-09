import { Geist, Geist_Mono, Cairo, Reem_Kufi } from 'next/font/google'
import { Toaster } from 'sonner'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { UserProvider } from '../lib/UserContext'
import SessionProviderWrapper from '../components/SessionProviderWrapper'
import AuthSync from '../components/AuthSync'
import GlobalTracker from '../components/GlobalTracker'
import SplashScreen from '../components/SplashScreen'
import ZoneGate from '../components/ZoneGate'
import PWAInstall from '../components/PWAInstall'
import CartBar from '../components/CartBar'
import MobileTabBar from '../components/MobileTabBar'
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

const reemKufi = Reem_Kufi({
  variable: '--font-reem-kufi',
  subsets:  ['arabic', 'latin'],
  weight:   ['400', '500', '700'],
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
  // Next's appleWebApp.capable only emits the standardized
  // "mobile-web-app-capable" meta tag; older iOS Safari versions still
  // require the legacy Apple-prefixed one to render standalone (no
  // browser chrome) when added to the home screen.
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/favicon.ico',   sizes: 'any' },
      { url: '/icon-16.png',   sizes: '16x16',   type: 'image/png' },
      { url: '/icon-32.png',   sizes: '32x32',   type: 'image/png' },
      { url: '/icon-48.png',   sizes: '48x48',   type: 'image/png' },
      { url: '/icon-64.png',   sizes: '64x64',   type: 'image/png' },
      { url: '/icon-96.png',   sizes: '96x96',   type: 'image/png' },
      { url: '/icon-192.png',  sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',  sizes: '512x512', type: 'image/png' },
    ],
    // apple-touch-icon.png has an opaque cream background — iOS renders
    // transparency as black, so this must never be swapped for a
    // transparent PNG.
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#C1502E',
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
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} ${reemKufi.variable} h-full antialiased`}
      // The blocking inline script below sets `data-splash-seen` on this
      // element from localStorage before hydration (see the script's own
      // comment), which the server can never know ahead of time — the
      // mismatch is expected, not a bug. suppressHydrationWarning only
      // silences the diff for this element's own attributes, not its
      // descendants.
      suppressHydrationWarning
    >
      <head>
        {/*
          Blocking (no async/defer) — runs before <body> is parsed/painted,
          so `data-splash-seen` is already correct by first paint. This is
          what lets components/SplashScreen.js avoid a flash in either
          direction: without this, React only learns the localStorage value
          in an effect that runs after the first paint, so the default has
          to guess — guessing "hidden" flashes real content at a first-time
          visitor before the splash pops in, guessing "shown" flashes the
          splash at a returning visitor before it's hidden. See the
          #wasla-splash rule in app/globals.css for the CSS side of this.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.setAttribute('data-splash-seen',localStorage.getItem('wasla_splash_seen_v1')==='1'?'1':'0')}catch(e){document.documentElement.setAttribute('data-splash-seen','0')}`,
          }}
        />
      </head>
      <body className={`min-h-full flex flex-col bg-sand-50 text-brand-900 ${locale === 'ar' ? 'font-(family-name:--font-cairo)' : ''}`}>
        <SessionProviderWrapper>
        <UserProvider initialUser={initialUser}>
        <SplashScreen />
        <AuthSync />
        <GlobalTracker />
        <ZoneGate />
        <PWAInstall />
        <CartBar />
        <MobileTabBar />
        <Toaster
          position="top-center"
          dir={dir}
          richColors
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '16px',
              fontWeight:   '600',
              fontSize:     '14px',
            },
          }}
        />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <footer className="bg-white border-t border-gray-100 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-brand-600 font-(family-name:--font-reem-kufi)">Wasla</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-400">{t('footer.tagline', locale)}</span>
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
                <Link href="/products"          className="hover:text-accent-400 transition-colors">{t('footer.products', locale)}</Link>
                <Link href="/terms"             className="hover:text-accent-400 transition-colors">{t('footer.terms', locale)}</Link>
                <Link href="/privacy"           className="hover:text-accent-400 transition-colors">{t('footer.privacy', locale)}</Link>
                <Link href="/register?mode=retailer" className="text-gray-400 hover:text-accent-400 transition-colors">{t('footer.sell', locale)}</Link>
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
