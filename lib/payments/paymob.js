import { PaymentProvider } from './PaymentProvider'

/**
 * Paymob (cards + mobile wallets). Stubbed cleanly behind env vars — no
 * keys have been supplied yet, so `initiate` returns a clear "not
 * configured" error rather than pretending to work. Wire up the real
 * Paymob auth/order/payment-key API calls here once PAYMOB_API_KEY,
 * PAYMOB_INTEGRATION_ID, and PAYMOB_IFRAME_ID are set.
 * Docs: https://docs.paymob.com/docs/accept-standard-redirect
 */
export class PaymobProvider extends PaymentProvider {
  get name() { return 'paymob' }

  get isConfigured() {
    return Boolean(process.env.PAYMOB_API_KEY && process.env.PAYMOB_INTEGRATION_ID && process.env.PAYMOB_IFRAME_ID)
  }

  async initiate(order) {
    if (!this.isConfigured) {
      const err = new Error('Paymob is not configured yet. Set PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, and PAYMOB_IFRAME_ID.')
      err.code = 'PROVIDER_NOT_CONFIGURED'
      throw err
    }

    // TODO once keys are supplied:
    // 1. POST /api/auth/tokens with PAYMOB_API_KEY -> auth_token
    // 2. POST /api/ecommerce/orders with auth_token, order.total, order.orderId -> paymob order id
    // 3. POST /api/acceptance/payment_keys with auth_token + PAYMOB_INTEGRATION_ID -> payment_token
    // 4. redirectUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${payment_token}`
    return { paymentStatus: 'PAYMENT_PENDING', redirectUrl: null, providerRef: null }
  }

  async verify() {
    if (!this.isConfigured) {
      const err = new Error('Paymob is not configured yet.')
      err.code = 'PROVIDER_NOT_CONFIGURED'
      throw err
    }
    // TODO: verify HMAC on the incoming Paymob webhook payload, then map
    // their transaction success/pending/failed to our paymentStatus.
    return { paymentStatus: 'PAYMENT_PENDING' }
  }
}
