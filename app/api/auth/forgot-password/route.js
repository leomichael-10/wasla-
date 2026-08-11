import { NextResponse } from 'next/server'
import { requestPasswordReset } from '../../../../lib/verification/passwordReset'

const GENERIC_MESSAGE = 'إذا كان بريدك الإلكتروني مسجلاً عندنا، هيوصلك إيميل فيه تعليمات إعادة تعيين كلمة المرور.'

// Same per-IP-only rate-limit shape as app/api/auth/resend-email-code/route.js
// — per-email throttling happens inside requestPasswordReset() (reuses
// lib/verification/core.js's isSendRateLimited), not here.
const rateLimitMap = new Map()
function isIpRateLimited(ip) {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

// POST /api/auth/forgot-password
// Public. Always returns the same generic message regardless of whether
// the email is registered, whether it's a Google-only account, or whether
// it just hit the per-email send rate limit — see
// lib/verification/passwordReset.js for why every one of those cases must
// be indistinguishable from here. Body: { email }
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (isIpRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
  }

  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    await requestPasswordReset(email)

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error)
    // Still don't leak anything — same generic message even on our own error.
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
}
