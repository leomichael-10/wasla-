'use client'
import { toE164 } from '../lib/phone'

// Shown under a phone/WhatsApp input so the person can confirm the
// number was understood correctly before submitting — international
// numbers typed without a '+' are easy to get subtly wrong (e.g. a
// Sudanese number missing its 249 prefix silently reading as Egyptian).
// Renders nothing until the value actually parses as a valid number.
export default function PhonePreview({ value }) {
  const normalized = toE164(value)
  if (!normalized) return null
  return <p dir="ltr" className="text-xs text-green-600 mt-1 font-mono">→ {normalized}</p>
}
