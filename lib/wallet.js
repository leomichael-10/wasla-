import { prisma } from './prisma'

// Shop commission wallet — prepaid model. SellerProfile.walletBalance is
// the running total; WalletTransaction is the append-only ledger that is
// the actual source of truth. Every balance mutation happens in the same
// DB transaction as the ledger row that explains it — never one without
// the other.

export const COMMISSION_RATE = 0.05
export const CREDIT_LIMIT    = -100 // EGP — balance may go negative down to this

/** True once a shop owes more than the credit limit and must be blocked from new orders. */
export function isBlocked(balance) {
  return Number(balance) <= CREDIT_LIMIT
}

function round2(n) {
  return Math.round(n * 100) / 100
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
    const amount = round2(Number(goodsSubtotal) * COMMISSION_RATE)
    const newBalance = round2(Number(seller.walletBalance) - amount)

    await tx.sellerProfile.update({
      where: { id: sellerId },
      data:  { walletBalance: newBalance },
    })

    const transaction = await tx.walletTransaction.create({
      data: {
        shopId:       sellerId,
        amount:       -amount,
        type:         'COMMISSION',
        balanceAfter: newBalance,
        orderId,
        note:         `${(COMMISSION_RATE * 100).toFixed(0)}% commission on order #${orderId}`,
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
