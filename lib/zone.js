const ZONE_COOKIE = 'wasla_zone'

export function getZoneCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${ZONE_COOKIE}=([^;]*)`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return null
  }
}

export function setZoneCookie(zone) {
  if (typeof document === 'undefined') return
  const value = encodeURIComponent(JSON.stringify({ id: zone.id, nameEn: zone.nameEn, nameAr: zone.nameAr }))
  document.cookie = `${ZONE_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 90}`
  window.dispatchEvent(new Event('zoneUpdated'))
}

/**
 * Opens the shared zone picker (components/ZoneGate.js) on demand, with the
 * current zone (if any) still set and shown as selected — no cookie
 * deletion, no reload. ZoneGate is mounted once, globally, in app/layout.js
 * and listens for this same 'openZonePicker' event; any "change delivery
 * zone" control calls this instead of building its own picker or deleting
 * the cookie to force ZoneGate's own first-visit effect to fire.
 */
export function openZonePicker() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('openZonePicker'))
}
