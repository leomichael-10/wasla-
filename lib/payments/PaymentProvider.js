/**
 * Common interface every payment provider implements. Keeping this thin and
 * provider-agnostic is what lets checkout swap COD/Paymob/manual-transfer
 * without touching order-creation logic.
 *
 * @typedef {Object} PaymentInitResult
 * @property {string} paymentStatus - one of 'unpaid' | 'PAYMENT_PENDING' | 'paid'
 * @property {string|null} redirectUrl - where to send the customer to complete payment, if any
 * @property {Object|null} providerRef - opaque provider reference to store/verify later
 */
export class PaymentProvider {
  /** Unique key stored in Order.paymentMethod */
  get name() {
    throw new Error('PaymentProvider subclasses must implement get name()')
  }

  /**
   * Called right after an order is created. Returns the initial payment
   * state for that order under this provider.
   * @param {{ orderId: number, total: number }} order
   * @returns {Promise<PaymentInitResult>}
   */
  async initiate(_order) {
    throw new Error('Not implemented')
  }

  /**
   * Called to check/confirm payment status after initiation (e.g. a Paymob
   * webhook, or an admin manually confirming a bank transfer receipt).
   * @param {{ orderId: number, providerRef?: Object }} params
   * @returns {Promise<{ paymentStatus: string }>}
   */
  async verify(_params) {
    throw new Error('Not implemented')
  }
}
