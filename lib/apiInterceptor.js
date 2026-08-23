import { t, getLocaleCookie } from './i18n'

// Every 401 this app's own API ever returns for a Bearer-authenticated
// request means the same thing: the caller's `wasla_token` (the custom
// JWT — see lib/auth.js + middleware.js) is missing, malformed, expired,
// or was signed under an old JWT_SECRET. The one 401 that ISN'T this —
// POST /api/auth/login's "Invalid email or password" — never carries an
// Authorization header (the caller isn't logged in yet), so keying off
// "the request had a Bearer header" cleanly excludes it without needing
// a route allowlist.
//
// Installed once (from components/SessionGuard.js) by wrapping
// window.fetch, so every one of this app's ~40 existing call sites that
// manually attach `Authorization: Bearer <token>` gets this behavior for
// free — none of them need to change.
export const SESSION_EXPIRED_EVENT = 'wasla:session-expired'

let installed = false
let refreshPromise = null
let redirecting = false

function extractBearerToken(init) {
  const headers = init?.headers
  if (!headers) return null
  const value = headers instanceof Headers
    ? headers.get('Authorization')
    : (headers['Authorization'] ?? headers['authorization'])
  if (!value || !value.startsWith('Bearer ')) return null
  return value.slice(7)
}

function withBearerToken(init, token) {
  const headers = init?.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : { ...(init?.headers ?? {}) }
  headers.Authorization = `Bearer ${token}`
  return { ...init, headers }
}

function storeSession(customToken, user) {
  localStorage.setItem('wasla_token', customToken)
  localStorage.setItem('wasla_user', JSON.stringify(user))
  document.cookie = `wasla_user_info=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
  redirecting = false
}

// Mints a fresh wasla_token from the current NextAuth session, if one is
// still valid — the same endpoint components/AuthSync.js uses after a
// Google sign-in. Shared/memoized so N concurrent 401s only trigger one
// refresh attempt, not N.
function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/token')
      .then(res => (res.ok ? res.json() : null))
      .catch(() => null)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

function friendlyUnauthorizedResponse(original) {
  const body = JSON.stringify({ error: t('errors.sessionExpired', getLocaleCookie()) })
  return new Response(body, {
    status:     original.status,
    statusText: original.statusText,
    headers:    { 'Content-Type': 'application/json' },
  })
}

export function installAuthInterceptor() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch(input, init)

    const token = extractBearerToken(init)
    if (!token) return response // not one of ours (e.g. the login form itself)

    if (response.status !== 401) {
      redirecting = false // a Bearer request just succeeded — session is fine again
      return response
    }

    const refreshed = await refreshSession()
    if (refreshed?.customToken && refreshed?.user) {
      storeSession(refreshed.customToken, refreshed.user)
      window.dispatchEvent(new CustomEvent('wasla:session-refreshed', { detail: refreshed.user }))
      // Silently retry the request that 401'd, now with a valid token —
      // the caller (e.g. the cart page loading addresses) never sees the
      // failure at all.
      return originalFetch(input, withBearerToken(init, refreshed.customToken))
    }

    // No NextAuth session to refresh from (plain email/password login,
    // or a Google session NextAuth can no longer decrypt — e.g. after a
    // NEXTAUTH_SECRET rotation). The token is genuinely gone; only a real
    // re-login can fix it.
    if (!redirecting) {
      redirecting = true
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
        detail: { redirect: window.location.pathname + window.location.search },
      }))
    }

    return friendlyUnauthorizedResponse(response)
  }
}
