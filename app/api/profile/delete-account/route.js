import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { getVerificationProvider } from '../../../../lib/verification'
import { checkSellerDeletionBlockers, deleteAccount } from '../../../../lib/accountDeletion'

const CONFIRM_WORDS = ['حذف', 'DELETE']

const rateLimitMap = new Map()
function isRateLimited(ip) {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

// POST /api/profile/delete-account — the logged-in user's own account,
// only ever theirs: auth.userId comes from the JWT middleware.js already
// verified, never from the request body, so there is no path from this
// route to deleting anyone else's account.
// Body: { password } for password accounts, { code } for Google-only
// accounts (see POST .../request-code), plus { confirmText } — the
// typed "حذف"/"DELETE" second confirmation step.
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
  const { password, code, confirmText } = body

  if (!CONFIRM_WORDS.includes(String(confirmText ?? '').trim())) {
    return NextResponse.json({ error: 'Confirmation text does not match.', code: 'CONFIRM_MISMATCH' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:   { id: auth.userId },
      include: { sellerProfile: true },
    })
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'Account not found.', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Sellers only: fail fast on either blocker before asking for
    // re-verification, so a seller who can't delete yet finds out
    // without having to type their password first.
    if (user.sellerProfile) {
      const blocker = await checkSellerDeletionBlockers(user.sellerProfile.id)
      if (blocker?.reason === 'ACTIVE_ORDERS') {
        return NextResponse.json(
          { error: `You have ${blocker.count} order(s) not yet delivered.`, code: 'ACTIVE_ORDERS', count: blocker.count },
          { status: 400 }
        )
      }
      if (blocker?.reason === 'NEGATIVE_BALANCE') {
        return NextResponse.json(
          { error: `Wallet owes EGP ${blocker.amount.toFixed(2)}.`, code: 'NEGATIVE_BALANCE', amount: blocker.amount },
          { status: 400 }
        )
      }
    }

    // Re-verify identity — password accounts compare a password same as
    // change-password does; Google-only accounts (no passwordHash) use
    // the emailed code from POST .../request-code instead.
    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json({ error: 'Password is required.', code: 'MISSING_PASSWORD' }, { status: 400 })
      }
      const matches = await bcrypt.compare(password, user.passwordHash)
      if (!matches) {
        return NextResponse.json({ error: 'Incorrect password.', code: 'WRONG_PASSWORD' }, { status: 400 })
      }
    } else {
      if (!code) {
        return NextResponse.json({ error: 'Confirmation code is required.', code: 'MISSING_CODE' }, { status: 400 })
      }
      const result = await getVerificationProvider('email').checkCode({ target: user.email, code, purpose: 'delete_account' })
      if (!result.valid) {
        const codeByReason = {
          no_active_code: 'NO_ACTIVE_CODE',
          expired:        'EXPIRED_CODE',
          locked:         'LOCKED',
          wrong_code:     'WRONG_CODE',
        }
        return NextResponse.json(
          { error: 'Invalid confirmation code.', code: codeByReason[result.reason] ?? 'WRONG_CODE' },
          { status: 400 }
        )
      }
    }

    await deleteAccount(user.id)

    return NextResponse.json({ message: 'Account deleted.' })
  } catch (error) {
    console.error('POST /api/profile/delete-account error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
