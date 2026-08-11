import bcrypt from 'bcryptjs'
import { prisma } from '../prisma'

// Shared OTP core: code generation, hashed storage, expiry, single-use
// consumption, and both send-rate-limiting and verify-attempt lockout.
// Used directly by every channel that has no external OTP service to
// delegate to (email always; WhatsApp only when unconfigured — see
// lib/verification/whatsappOtp.js).

export const CODE_LENGTH          = 6
export const CODE_EXPIRY_MIN      = 10
export const MAX_VERIFY_ATTEMPTS  = 5
export const MAX_SENDS_PER_WINDOW = 3
export const SEND_WINDOW_MIN      = 10

export function generateCode() {
  const min = 10 ** (CODE_LENGTH - 1)
  const max = 10 ** CODE_LENGTH
  return String(Math.floor(min + Math.random() * (max - min)))
}

/** True if `target` has already requested MAX_SENDS_PER_WINDOW codes on this channel recently. */
export async function isSendRateLimited(channel, target) {
  const since = new Date(Date.now() - SEND_WINDOW_MIN * 60_000)
  const count = await prisma.verificationCode.count({
    where: { channel, target, createdAt: { gte: since } },
  })
  return count >= MAX_SENDS_PER_WINDOW
}

/**
 * Generates, hashes, and stores a new code. Returns the plaintext code
 * (caller sends it, never stores it). `expiryMinutes` defaults to the
 * shared constant but is overridable per purpose (e.g. password reset
 * uses a longer window — see lib/verification/passwordReset.js) without
 * changing the default for every other caller.
 */
export async function issueCode(channel, target, purpose, expiryMinutes = CODE_EXPIRY_MIN) {
  const code     = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + expiryMinutes * 60_000)
  await prisma.verificationCode.create({
    data: { channel, target, purpose, codeHash, expiresAt },
  })
  return code
}

/**
 * Checks a submitted code against the latest active (unconsumed,
 * unexpired, not-locked-out) code for this channel/target/purpose.
 * Single-use: marks consumedAt on success. Locks after MAX_VERIFY_ATTEMPTS
 * wrong tries on that specific code row.
 */
export async function checkCode(channel, target, purpose, inputCode) {
  const record = await prisma.verificationCode.findFirst({
    where:   { channel, target, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return { valid: false, reason: 'no_active_code' }
  if (record.expiresAt < new Date()) return { valid: false, reason: 'expired' }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) return { valid: false, reason: 'locked' }

  const match = await bcrypt.compare(String(inputCode ?? ''), record.codeHash)
  if (!match) {
    const updated = await prisma.verificationCode.update({
      where: { id: record.id },
      data:  { attempts: { increment: 1 } },
    })
    const attemptsLeft = Math.max(0, MAX_VERIFY_ATTEMPTS - updated.attempts)
    return { valid: false, reason: attemptsLeft === 0 ? 'locked' : 'wrong_code', attemptsLeft }
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data:  { consumedAt: new Date() },
  })
  return { valid: true }
}
