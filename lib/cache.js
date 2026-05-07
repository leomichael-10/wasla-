/**
 * Simple in-memory cache for server-side API responses.
 * Keys expire after ttlSeconds.
 */
const store = new Map()

/**
 * Return cached value, or call fn() and cache the result.
 * @param {string} key
 * @param {() => Promise<any>} fn
 * @param {number} ttlSeconds
 */
export async function cache(key, fn, ttlSeconds = 60) {
  const now = Date.now()
  const entry = store.get(key)
  if (entry && entry.expiresAt > now) {
    return entry.value
  }
  const value = await fn()
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 })
  return value
}

/**
 * Remove a key from cache.
 * @param {string} key
 */
export function invalidate(key) {
  store.delete(key)
}

/**
 * Remove all keys that start with prefix.
 * @param {string} prefix
 */
export function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
