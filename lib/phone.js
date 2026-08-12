import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Wasla's sellers are frequently Sudanese living in Cairo, so a bare
// (no country code) number can't be assumed Egyptian just because it's
// the marketplace's home market — but it's still the best single default
// for a number typed with no '+'/'00' prefix, since most users type their
// own country's number without a code and most of this app's users are
// in Egypt. Explicit '+'/'00' always wins regardless of this default
// (libphonenumber-js treats those as a fully-specified international
// number and ignores the default country).
const DEFAULT_COUNTRY = 'EG'

/**
 * Parse and validate any phone number to canonical E.164 — international
 * with an explicit country code (+249…, 00966…) or a bare local number
 * (assumed Egyptian per the module-level default). Tolerant of
 * Arabic-Indic digits, spaces, dashes, and parentheses (libphonenumber-js
 * normalizes all of that internally).
 * @returns {string|null} E.164 (e.g. "+201012345678") or null if invalid.
 */
export function toE164(value) {
  if (!value) return null
  try {
    const parsed = parsePhoneNumberFromString(String(value), DEFAULT_COUNTRY)
    return parsed?.isValid() ? parsed.number : null
  } catch {
    return null
  }
}

/** True for any valid phone number, international or bare-local-Egyptian. */
export function isValidPhone(value) {
  return toE164(value) !== null
}

/** E.164 without the leading '+' — what wa.me links and Twilio's `to:` WhatsApp param expect. */
export function toWaId(value) {
  const e164 = toE164(value)
  return e164 ? e164.slice(1) : null
}
