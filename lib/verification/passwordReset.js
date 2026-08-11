import bcrypt from 'bcryptjs'
import { isSendRateLimited, issueCode, checkCode } from './core'
import { sendEmail } from '../email'
import { passwordResetEmail, googleAccountResetEmail, APP_URL } from '../emailTemplates'
import { prisma } from '../prisma'

const CHANNEL     = 'email'
const PURPOSE      = 'password_reset'
const EXPIRY_MIN   = 15 // longer than the 10-minute default signup/OTP window (see lib/verification/core.js) — a reset email is more likely to be read a few minutes late than a signup code

/**
 * Always resolves, never throws, never reveals whether `email` belongs to
 * an account — the caller (app/api/auth/forgot-password/route.js) must
 * return the exact same generic response no matter what happened here,
 * including when the per-email send rate limit silently swallows the
 * request. That's deliberate: a *different* HTTP response when rate-limited
 * vs. not would itself leak whether the email is registered, since only a
 * registered email can ever accumulate the VerificationCode rows that
 * `isSendRateLimited` counts.
 */
export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({
    where:  { email },
    select: { passwordHash: true },
  })
  if (!user) return

  if (!user.passwordHash) {
    // Google-only account — nothing to reset. Tell them by email (only the
    // account owner ever reads it) rather than creating a password or
    // erroring; the HTTP response stays identical either way.
    const { subject, html, text } = googleAccountResetEmail()
    await sendEmail(email, subject, html, text)
    return
  }

  if (await isSendRateLimited(CHANNEL, email)) return

  const code = await issueCode(CHANNEL, email, PURPOSE, EXPIRY_MIN)
  // The code doubles as the link's token — one secret, one place it's
  // checked (checkCode below), rather than a parallel token scheme. See
  // PROGRESS.md for why that's an acceptable, deliberate reuse: the code
  // is single-use and locks out after 5 wrong guesses regardless of
  // length, so its only real exposure risk is leaking the link itself,
  // not its guessability.
  const resetUrl = `${APP_URL}/reset-password?email=${encodeURIComponent(email)}&code=${code}`
  const { subject, html, text } = passwordResetEmail({ code, resetUrl })
  await sendEmail(email, subject, html, text)
}

/**
 * @returns {Promise<{ ok: boolean, reason?: string }>} reason is one of
 * checkCode's ('no_active_code' | 'expired' | 'locked' | 'wrong_code') or
 * 'google_account' — every reason maps to the same generic client-facing
 * error message (see app/reset-password/page.js); it's only distinguished
 * here for logging/debugging, never surfaced to the caller by name.
 */
export async function completePasswordReset(email, code, newPassword) {
  const result = await checkCode(CHANNEL, email, PURPOSE, code)
  if (!result.valid) return { ok: false, reason: result.reason }

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, passwordHash: true },
  })
  // Not reachable in the normal flow — requestPasswordReset() never issues
  // a code for a nonexistent or Google-only account — but never create or
  // overwrite a password here regardless of how this was reached.
  if (!user || !user.passwordHash) return { ok: false, reason: 'google_account' }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data:  {
      passwordHash,
      // middleware.js rejects any JWT issued before this timestamp, so
      // every session this user was already signed into — stolen or
      // not — stops working immediately.
      passwordChangedAt: new Date(),
    },
  })
  return { ok: true }
}
