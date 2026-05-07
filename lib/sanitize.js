/**
 * Trim whitespace and remove HTML tags. Caps at maxLen characters.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function sanitizeString(str, maxLen = 500) {
  if (typeof str !== 'string') return ''
  return str
    .trim()
    .replace(/<[^>]*>/g, '')
    .slice(0, maxLen)
}

/**
 * Lowercase and trim an email address.
 * @param {string} email
 * @returns {string}
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

/**
 * Parse and clamp an integer.
 * @param {any} val
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
 */
export function sanitizeInt(val, min = 0, max = 999999) {
  const n = parseInt(val, 10)
  if (isNaN(n)) return null
  return Math.max(min, Math.min(max, n))
}
