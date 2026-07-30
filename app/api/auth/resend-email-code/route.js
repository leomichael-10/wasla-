import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getVerificationProvider } from '../../../../lib/verification'

const GENERIC_MESSAGE = 'إذا كان بريدك الإلكتروني يحتاج تفعيل، هيوصلك كود التفعيل.'

const rateLimitMap = new Map()
function isIpRateLimited(ip) {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

// POST /api/auth/resend-email-code
// Public. Always returns the same generic message regardless of whether
// the email exists or is already verified — an OTP-resend endpoint that
// distinguishes those cases is a classic account-enumeration leak.
// Body: { email }
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

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } })
    if (user && !user.emailVerified) {
      // Only actually send when there's something to verify — but the
      // HTTP response is identical either way.
      await getVerificationProvider('email').requestCode({ target: email, purpose: 'signup' }).catch(() => {})
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('POST /api/auth/resend-email-code error:', error)
    // Still don't leak anything — same generic message even on our own error.
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
}
