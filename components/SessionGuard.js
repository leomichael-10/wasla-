'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '../lib/UserContext'
import { installAuthInterceptor, SESSION_EXPIRED_EVENT } from '../lib/apiInterceptor'
import { getLocaleCookie, t } from '../lib/i18n'

// Mounted once in app/layout.js, alongside AuthSync. Installs the
// window.fetch wrapper that catches every 401 the app's own API returns
// for an authenticated request (see lib/apiInterceptor.js), then reacts
// to the one it can't silently recover from: clears the stale
// wasla_token/wasla_user, tells the user in their own language instead
// of showing the server's raw "Invalid or expired token" string, and
// sends them to log back in — landing back on the page they were on.
export default function SessionGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useUser()

  useEffect(() => {
    installAuthInterceptor()
  }, [])

  useEffect(() => {
    function handleExpired(e) {
      logout()
      toast.error(t('errors.sessionExpired', getLocaleCookie()))
      const redirect = e?.detail?.redirect || pathname || '/'
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [logout, router, pathname])

  return null
}
