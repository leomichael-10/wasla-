import { NextResponse } from 'next/server'
import { completePasswordReset } from '../../../../lib/verification/passwordReset'

const rateLimitMap = new Map()
function isIpRateLimited(ip) {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

// Matches app/register/page.js's password input (minLength={6}) — the
// task asked to match the existing signup rule, not invent a new one.
const MIN_PASSWORD_LENGTH = 6

// Maps completePasswordReset()'s internal reasons to a small, stable set of
// client-facing codes. 'expired' and 'locked' are safe to distinguish: both
// are only reachable by someone who already submitted the *correct* code
// for that email (guessing a random 6-digit code and landing on an expired
// or locked row by chance is ~1-in-a-million), so surfacing them doesn't
// tell a guesser anything they didn't already prove. 'no_active_code',
// 'wrong_code', and 'google_account' are deliberately collapsed into one
// WRONG_CODE bucket — distinguishing "no code was ever issued" from "a code
// exists but doesn't match" would leak whether the email has a pending
// reset request, i.e. whether it's a registered password account.
function toClientErrorCode(reason) {
  if (reason === 'expired') return 'EXPIRED_CODE'
  if (reason === 'locked')  return 'LOCKED'
  return 'WRONG_CODE'
}

// POST /api/auth/reset-password
// Public. Body: { email, code, newPassword }.
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (isIpRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, code, newPassword } = body
  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'Email, code, and new password are required.' }, { status: 400 })
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 })
  }

  try {
    const result = await completePasswordReset(email, code, newPassword)
    if (!result.ok) {
      return NextResponse.json({ error: toClientErrorCode(result.reason) }, { status: 400 })
    }
    return NextResponse.json({ message: 'Password reset successfully.' })
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
