// Hand-rolled service worker (see DECISIONS.md for why not next-pwa/serwist).
// Strategy: cache-first for static assets/icons, network-first with a cache
// fallback for everything else (pages, API) so the app shell still loads
// offline-ish and stale data beats a blank screen on a flaky connection.

// Bumped to v2 to force-evict any previously cached error responses for
// static assets (see the `res.ok` check below) — a stale 404 cached from
// before an asset existed would otherwise be replayed forever under the
// cache-first strategy, even after the real file starts serving fine.
const CACHE_NAME = 'wasla-v2'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

function isStaticAsset(url) {
  return /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname) || url.pathname.startsWith('/icons/')
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never intercept API calls — always hit the network so data stays fresh.
  if (url.pathname.startsWith('/api/')) return

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request).then(res => {
        // Only cache successful responses — caching a 404 (e.g. an asset
        // requested before it existed) would otherwise permanently poison
        // this cache-first path for that URL, surviving even after the
        // real file starts serving fine.
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return res
      }))
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {})
        return res
      })
      .catch(() => caches.match(request).then(cached => cached ?? caches.match('/')))
  )
})
