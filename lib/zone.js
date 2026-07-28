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
