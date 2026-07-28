// Given a shop's cutoff time ("HH:MM", Cairo local time) and a zone's ETA
// window, resolve whether same-day delivery is still possible right now, or
// the order falls back to next-day at the same time-of-day window.
export function resolvePromise(cutoffTime, etaMinutes) {
  const now = new Date()
  if (!cutoffTime) {
    return { sameDay: true, promisedEta: new Date(now.getTime() + etaMinutes * 60_000) }
  }
  const [h, m] = cutoffTime.split(':').map(Number)
  const cutoff = new Date(now)
  cutoff.setHours(h, m, 0, 0)

  if (now < cutoff) {
    return { sameDay: true, promisedEta: new Date(now.getTime() + etaMinutes * 60_000) }
  }
  const nextDay = new Date(now)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(h, m, 0, 0)
  return { sameDay: false, promisedEta: nextDay }
}

// Server-authoritative delivery fee for a shop×zone pair — never trust a
// client-supplied fee for order creation, always recompute from coverage.
export function resolveFee(zone, coverage) {
  return coverage.feeOverride != null ? Number(coverage.feeOverride) : Number(zone.baseFee)
}
