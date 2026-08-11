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

// POST /api/auth/reset-password
// Public. Body: { email, code, newPassword }. Every checkCode failure
// reason (wrong code, expired, already used, locked after 5 attempts)
// collapses to the same generic error here — distinguishing them in the
// response would leak whether a pending reset exists for that email.
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
      return NextResponse.json({ error: 'Invalid or expired code. Please request a new reset link.' }, { status: 400 })
    }
    return NextResponse.json({ message: 'Password reset successfully.' })
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
