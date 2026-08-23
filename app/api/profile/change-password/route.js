import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// Same rule as app/api/auth/reset-password/route.js and the register
// form's password input — matching, not inventing a stricter one.
const MIN_PASSWORD_LENGTH = 6

// Same shape as app/api/auth/login/route.js's rate limiter — this route
// is authenticated, but an attacker with a stolen session token and no
// password could still use it to brute-force the current password.
const rateLimitMap = new Map()
function isRateLimited(ip) {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

// POST /api/profile/change-password — the logged-in user's own password.
// Deliberately NOT under /api/auth/ — that whole prefix is public in
// middleware.js (login/register/reset-password all need to work with no
// existing session), so a route here would never get the JWT-verified
// x-user-id header this route depends on. Nested under /api/profile
// instead, which middleware already protects like any other route.
// Body: { currentPassword, newPassword }
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait.', code: 'RATE_LIMITED' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body', code: 'INVALID_BODY' }, { status: 400 })
  }

  // Every error response carries a stable `code` (same pattern as
  // EMAIL_NOT_VERIFIED elsewhere in this app) — the client maps it to a
  // localized message rather than displaying this English text directly
  // or fragile-matching against it.
  const { currentPassword, newPassword } = body
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required.', code: 'MISSING_FIELDS' }, { status: 400 })
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`, code: 'TOO_SHORT' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      return NextResponse.json({ error: 'Account not found.', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Google-only accounts (see lib/verification/passwordReset.js for the
    // same handling on the logged-out forgot-password path) — nothing to
    // compare against, never create a password here either.
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'This account signs in with Google — there is no password to change.', code: 'GOOGLE_ONLY' },
        { status: 400 }
      )
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!matches) {
      return NextResponse.json({ error: 'Current password is incorrect.', code: 'WRONG_PASSWORD' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        // middleware.js rejects any JWT issued before this — every
        // session this user was signed into (stolen or not) stops
        // working immediately. Including the token this very request
        // authenticated with, which is why a fresh one is issued below.
        passwordChangedAt: new Date(),
      },
    })

    const token = jwt.sign(
      { userId: updated.id, email: updated.email, role: updated.role, isBanned: updated.isBanned },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    const userData = { id: updated.id, email: updated.email, role: updated.role, city: updated.city }

    const response = NextResponse.json({ message: 'Password changed successfully.', token, user: userData })
    response.cookies.set('wasla_user_info', JSON.stringify(userData), {
      path:     '/',
      maxAge:   7 * 24 * 60 * 60,
      sameSite: 'lax',
      httpOnly: true,
    })
    return response
  } catch (error) {
    console.error('POST /api/profile/change-password error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
