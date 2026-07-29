'use client'
import { useEffect, useState } from 'react'
import { getLocaleCookie, t } from '../lib/i18n'

const DISMISS_KEY = 'wasla_pwa_dismissed_at'
const DISMISS_DAYS = 7

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
}

function recentlyDismissed() {
  if (typeof window === 'undefined') return false
  const raw = window.localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const days = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24)
  return days < DISMISS_DAYS
}

export default function PWAInstall() {
  const [locale,       setLocale]       = useState('ar')
  const [deferred,     setDeferred]     = useState(null)
  const [showBanner,   setShowBanner]   = useState(false)
  const [showIosHint,  setShowIosHint]  = useState(false)

  useEffect(() => {
    setLocale(getLocaleCookie())

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    if (isStandalone() || recentlyDismissed()) return

    if (isIos()) {
      setShowIosHint(true)
      return
    }

    function onBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferred(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    function onInstalled() {
      setShowBanner(false)
      setShowIosHint(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setShowBanner(false)
    setShowIosHint(false)
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
  }

  async function handleInstall() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setShowBanner(false)
  }

  if (!showBanner && !showIosHint) return null

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div dir={dir} className="fixed bottom-4 inset-x-4 z-40 max-w-sm mx-auto sm:inset-x-auto sm:end-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-brand-100 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center shrink-0 text-white font-black">
          W
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{t('pwa.installTitle', locale)}</p>
          {showIosHint ? (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {t('pwa.iosBody', locale)}{' '}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 inline-block align-text-bottom">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 3.5 3.5M12 4 8.5 7.5M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
              </svg>
              , {t('pwa.iosThenTap', locale)}.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">{t('pwa.installBody', locale)}</p>
          )}
          <div className="flex items-center gap-3 mt-2.5">
            {!showIosHint && (
              <button
                onClick={handleInstall}
                className="text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white px-4 py-1.5 rounded-xl transition-colors"
              >
                {t('pwa.installButton', locale)}
              </button>
            )}
            <button
              onClick={dismiss}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('pwa.dismiss', locale)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
