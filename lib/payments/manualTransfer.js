import { PaymentProvider } from './PaymentProvider'

/**
 * InstaPay / Vodafone Cash manual transfer. The customer sends money
 * out-of-band and uploads a receipt image (via /api/orders/[id]/receipt,
 * which stores it on Cloudinary same as product photos); the order then
 * sits in PAYMENT_PENDING until an admin confirms it via
 * PATCH /api/admin/orders/[id]/payment.
 */
export class ManualTransferProvider extends PaymentProvider {
  get name() { return 'manual_transfer' }

  async initiate() {
    // Payment isn't collected yet — it's pending until a receipt is
    // uploaded and an admin confirms it.
    return { paymentStatus: 'PAYMENT_PENDING', redirectUrl: null, providerRef: null }
  }

  async verify() {
    // Confirmation here is a human action (admin reviewing the uploaded
    // receipt), not an automated check — see the admin payment-confirm route.
    return { paymentStatus: 'PAYMENT_PENDING' }
  }
}
