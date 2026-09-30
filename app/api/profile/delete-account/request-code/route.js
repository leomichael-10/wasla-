import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'
import { getVerificationProvider } from '../../../../../lib/verification'

const rateLimitMap = new Map()
function isRateLimited(ip) {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

// POST /api/profile/delete-account/request-code — the logged-in user's
// own account. Sends an emailed confirmation code for accounts with no
// password to re-verify (Google-only signup, see authOptions.js), the
// step-up confirmation DELETE /api/profile/delete-account needs before
// it will touch anything. Password accounts confirm with their password
// instead and never call this route.
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait.', code: 'RATE_LIMITED' }, { status: 429 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { email: true, passwordHash: true } })
    if (!user) {
      return NextResponse.json({ error: 'Account not found.', code: 'NOT_FOUND' }, { status: 404 })
    }
    if (user.passwordHash) {
      return NextResponse.json(
        { error: 'This account has a password — confirm with that instead.', code: 'HAS_PASSWORD' },
        { status: 400 }
      )
    }

    const result = await getVerificationProvider('email').requestCode({ target: user.email, purpose: 'delete_account' })
    if (!result.sent) {
      return NextResponse.json({ error: 'Too many requests. Please wait.', code: 'RATE_LIMITED' }, { status: 429 })
    }

    return NextResponse.json({ message: 'Confirmation code sent.' })
  } catch (error) {
    console.error('POST /api/profile/delete-account/request-code error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
