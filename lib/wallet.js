import { prisma } from './prisma'

// Shop commission wallet — prepaid model. SellerProfile.walletBalance is
// the running total; WalletTransaction is the append-only ledger that is
// the actual source of truth. Every balance mutation happens in the same
// DB transaction as the ledger row that explains it — never one without
// the other.

// Fallback only — used if CommissionSetting is somehow empty (should
// never happen post-migration; see prisma/migrations/20260811090000_
// commission_settings, which seeds this exact value as the first row).
export const DEFAULT_COMMISSION_RATE = 0.05
export const CREDIT_LIMIT            = -100 // EGP — balance may go negative down to this

/** True once a shop owes more than the credit limit and must be blocked from new orders. */
export function isBlocked(balance) {
  return Number(balance) <= CREDIT_LIMIT
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * The commission rate in effect right now (fraction, e.g. 0.05 = 5%).
 * CommissionSetting is append-only — a rate change INSERTs a new row
 * rather than updating one in place (see app/api/admin/commission-rate/
 * route.js), so "current" is always the most recently created row.
 */
export async function getCurrentCommissionRate(tx = prisma) {
  const latest = await tx.commissionSetting.findFirst({ orderBy: { id: 'desc' } })
  return latest ? Number(latest.rate) : DEFAULT_COMMISSION_RATE
}

/**
 * Deduct commission for one shop's share of a completed order. Idempotent
 * on (orderId, shopId) — if a COMMISSION row already exists for this pair,
 * this is a no-op (returns { skipped: true }), so re-firing a status
 * update (or a retried webhook) never double-deducts.
 *
 * Locking: takes an explicit row lock on the SellerProfile row
 * (`SELECT ... FOR UPDATE`) before reading its balance, inside a single
 * Prisma transaction that also writes the new balance and inserts the
 * ledger row. Two concurrent completions for the same shop serialize on
 * that lock — the second waits for the first to commit (or roll back)
 * before it can even read the balance, so there is no read-then-write
 * race. The `@@unique([orderId, shopId, type])` constraint on
 * WalletTransaction is a second, independent backstop: even if two
 * completions somehow interleaved, only one ledger INSERT can succeed,
 * and because it's in the same transaction as the balance update, a
 * failed insert rolls back that update too — never a partial effect.
 */
export async function deductCommission({ sellerId, orderId, goodsSubtotal, tx: outerTx }) {
  const run = async (tx) => {
    await tx.$queryRaw`SELECT id FROM "SellerProfile" WHERE id = ${sellerId} FOR UPDATE`

    const existing = await tx.walletTransaction.findFirst({
      where: { orderId, shopId: sellerId, type: 'COMMISSION' },
    })
    if (existing) {
      return { skipped: true, transaction: existing }
    }

    const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } })
    // Snapshotted here, at charge time — never re-read from this row again,
    // so a later rate change can't alter what this specific order already
    // cost the shop. See WalletTransaction.commissionRate in schema.prisma.
    const rate = await getCurrentCommissionRate(tx)
    const amount = round2(Number(goodsSubtotal) * rate)
    const newBalance = round2(Number(seller.walletBalance) - amount)

    await tx.sellerProfile.update({
      where: { id: sellerId },
      data:  { walletBalance: newBalance },
    })

    const transaction = await tx.walletTransaction.create({
      data: {
        shopId:         sellerId,
        amount:         -amount,
        type:           'COMMISSION',
        balanceAfter:   newBalance,
        orderId,
        commissionRate: rate,
        note:           `${(rate * 100).toFixed(2).replace(/\.?0+$/, '')}% commission on order #${orderId}`,
      },
    })

    return { skipped: false, transaction, newBalance }
  }

  return outerTx ? run(outerTx) : prisma.$transaction(run)
}

/** Admin top-up. Always increases balance (positive amount required). */
export async function topUp({ sellerId, amount, note, adminId }) {
  const numericAmount = round2(Number(amount))
  if (!numericAmount || numericAmount <= 0) {
    throw Object.assign(new Error('Top-up amount must be a positive number'), { code: 'INVALID_AMOUNT' })
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "SellerProfile" WHERE id = ${sellerId} FOR UPDATE`

    const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } })
    const newBalance = round2(Number(seller.walletBalance) + numericAmount)

    await tx.sellerProfile.update({
      where: { id: sellerId },
      data:  { walletBalance: newBalance },
    })

    const transaction = await tx.walletTransaction.create({
      data: {
        shopId:       sellerId,
        amount:       numericAmount,
        type:         'TOPUP',
        balanceAfter: newBalance,
        note:         note || null,
        createdBy:    adminId,
      },
    })

    return { transaction, newBalance }
  })
}

/** Admin manual correction — signed amount, note required. */
export async function adjustBalance({ sellerId, amount, note, adminId }) {
  const numericAmount = round2(Number(amount))
  if (!numericAmount) {
    throw Object.assign(new Error('Adjustment amount must be a non-zero number'), { code: 'INVALID_AMOUNT' })
  }
  if (!note?.trim()) {
    throw Object.assign(new Error('A note is required for manual adjustments'), { code: 'NOTE_REQUIRED' })
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "SellerProfile" WHERE id = ${sellerId} FOR UPDATE`

    const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } })
    const newBalance = round2(Number(seller.walletBalance) + numericAmount)

    await tx.sellerProfile.update({
      where: { id: sellerId },
      data:  { walletBalance: newBalance },
    })

    const transaction = await tx.walletTransaction.create({
      data: {
        shopId:       sellerId,
        amount:       numericAmount,
        type:         'ADJUSTMENT',
        balanceAfter: newBalance,
        note:         note.trim(),
        createdBy:    adminId,
      },
    })

    return { transaction, newBalance }
  })
}

/**
 * Admin-set platform commission rate (fraction, e.g. 0.055 = 5.5%).
 * Append-only — INSERTs a new CommissionSetting row rather than updating
 * one, so the table is its own change history (who/when — see
 * app/api/admin/commission-rate/route.js). Never touches past
 * WalletTransaction rows; deductCommission() already snapshotted
 * whatever rate was current at each charge.
 */
export async function setCommissionRate({ rate, adminId }) {
  const numericRate = Number(rate)
  if (!Number.isFinite(numericRate) || numericRate < 0 || numericRate > 1) {
    throw Object.assign(new Error('Commission rate must be between 0% and 100%'), { code: 'INVALID_RATE' })
  }
  // 4 decimal places on the fraction = 2 on the percent (e.g. 0.0525 =
  // 5.25%) — "reasonable decimals" without silently truncating input.
  const rounded = Math.round(numericRate * 10000) / 10000

  return prisma.commissionSetting.create({
    data: { rate: rounded, updatedBy: adminId ?? null },
  })
}
