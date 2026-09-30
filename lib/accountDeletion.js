import { prisma } from './prisma'
import { sendEmail } from './email'
import { accountDeletedEmail } from './emailTemplates'

// Undelivered — a seller can't delete their account out from under an
// order still in flight. Matches app/dashboard/orders/page.js's own
// PLACED/SHOP_CONFIRMED/PREPARING/OUT_FOR_DELIVERY vs DELIVERED/CANCELLED
// split.
export const ACTIVE_ORDER_STATUSES = ['PLACED', 'SHOP_CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY']

function placeholderEmail(userId) {
  // Guaranteed unique (keyed by id) and obviously non-real — email is
  // @unique on User, so this must never collide with a future signup.
  return `deleted-user-${userId}@wasla.deleted`
}

/**
 * Read-only check for the two conditions that block a SELLER from
 * deleting their account. Returns null if nothing blocks it, otherwise
 * { reason: 'ACTIVE_ORDERS', count } or { reason: 'NEGATIVE_BALANCE', amount }.
 * Never called for customers — they have no such restriction.
 */
export async function checkSellerDeletionBlockers(sellerProfileId) {
  const activeOrders = await prisma.order.count({
    where: { sellerId: sellerProfileId, status: { in: ACTIVE_ORDER_STATUSES } },
  })
  if (activeOrders > 0) {
    return { reason: 'ACTIVE_ORDERS', count: activeOrders }
  }

  const seller = await prisma.sellerProfile.findUnique({
    where:  { id: sellerProfileId },
    select: { walletBalance: true },
  })
  const balance = Number(seller?.walletBalance ?? 0)
  if (balance < 0) {
    return { reason: 'NEGATIVE_BALANCE', amount: Math.abs(balance) }
  }

  return null
}

/**
 * Anonymizes and permanently signs out a user's account. Caller must
 * already have (a) re-verified the requester's identity (password or an
 * emailed confirmation code) and (b) for sellers, confirmed via
 * checkSellerDeletionBlockers() that nothing blocks it — this function
 * does not re-check either.
 *
 * Never hard-deletes the User row: Order.customerId, WalletTransaction
 * (via SellerProfile), and Review all reference it, and a customer
 * deleting their account must not erase a shop's sales/commission
 * history. Anonymizes personal fields in place instead, and — for a
 * seller — deactivates the shop (SellerProfile.isOpen = false) so it
 * drops out of the storefront while its products/orders/ledger stay
 * intact and attributed to the now-closed shop.
 */
export async function deleteAccount(userId) {
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { sellerProfile: true, customerProfile: true },
  })
  if (!user) throw new Error('User not found')
  if (user.deletedAt) return // already deleted — idempotent no-op

  const originalEmail = user.email // captured before it's overwritten below

  await prisma.$transaction(async (tx) => {
    // Saved addresses carry real PII (street/building/phone/…). Every
    // past Order already has its own frozen snapshot of the delivery
    // address as plain fields on the Order row itself (deliveryAddress,
    // addressArea, addressBuilding, ...) — it never re-reads the live
    // Address row — so detaching the FK and removing the address rows
    // loses no order-history detail.
    await tx.order.updateMany({
      where: { customerId: userId, addressId: { not: null } },
      data:  { addressId: null },
    })
    await tx.address.deleteMany({ where: { userId } })

    if (user.customerProfile) {
      await tx.customerProfile.update({
        where: { userId },
        data:  { fullName: null, deliveryAddress: null },
      })
    }

    if (user.sellerProfile) {
      await tx.sellerProfile.update({
        where: { userId },
        data:  {
          isOpen:           false, // same mechanism the seller's own "Close Shop" toggle uses
          whatsappNumber:   null,
          whatsappVerified: false,
        },
      })
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        email:             placeholderEmail(userId),
        passwordHash:      null,
        phone:             null,
        whatsapp:          null,
        gender:            null,
        emailVerified:     false,
        deletedAt:         new Date(),
        // Same field middleware.js already checks to kill every existing
        // JWT the instant a password changes — reused here so every
        // session this user was signed into stops working immediately,
        // not just the one that made this request.
        passwordChangedAt: new Date(),
      },
    })
  })

  // Timestamp + user id only, no personal data — the anonymized row
  // above is itself the durable audit record; this is just the
  // point-in-time log line.
  console.log(`[account-deletion] user #${userId} deleted at ${new Date().toISOString()}`)

  try {
    const { subject, html, text } = accountDeletedEmail()
    await sendEmail(originalEmail, subject, html, text)
  } catch (err) {
    // Deletion itself already committed — a failed confirmation email
    // must not make the request look like it failed.
    console.error('[account-deletion] confirmation email failed:', err)
  }
}
