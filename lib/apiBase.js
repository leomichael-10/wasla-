import { isNativeApp } from './capacitor'

// The deployed web app always calls /api/* as a relative path on its own
// origin. A Capacitor build has no local server — its origin is
// capacitor://localhost (iOS/Android WebView) with nothing listening there,
// so every API call must go to the real, deployed API instead. This is a
// runtime check (not a build-time env split) so the same bundle works
// either way, matching the isNativeApp() pattern already used for the
// splash screen and service worker.
const PRODUCTION_API_ORIGIN = 'https://www.wasla-249.com'

export function apiUrl(path) {
  if (isNativeApp()) return `${PRODUCTION_API_ORIGIN}${path}`
  return path
}
