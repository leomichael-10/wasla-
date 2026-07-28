// Egyptian mobile numbers: 01[0-2,5]XXXXXXXX (11 digits, e.g. 010/011/012/015).
const EG_PHONE_RE = /^01[0125]\d{8}$/

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Convert Arabic-Indic digits (٠-٩) to ASCII so validation/storage is consistent. */
export function normalizeDigits(value) {
  if (!value) return value
  return String(value).replace(/[٠-٩]/g, d => String(ARABIC_INDIC_DIGITS.indexOf(d)))
}

/** True for a valid Egyptian mobile number, tolerant of Arabic-Indic digits and spaces/dashes. */
export function isEgyptianPhone(value) {
  if (!value) return false
  const normalized = normalizeDigits(value).replace(/[\s-]/g, '')
  return EG_PHONE_RE.test(normalized)
}
