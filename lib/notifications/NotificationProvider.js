/**
 * Common interface for notifying a shop that it has a new order to fulfill.
 * Mirrors lib/payments/PaymentProvider.js's shape so swapping in a real
 * push-based provider (WhatsApp Business API via Twilio/Meta) later is a
 * new class, not a rewrite of the call sites.
 */
export class NotificationProvider {
  get name() {
    throw new Error('NotificationProvider subclasses must implement get name()')
  }

  /**
   * Build whatever's needed to notify the shop about this order.
   * Providers that can send server-side (e.g. an approved WhatsApp
   * Business API) should actually send here and return { sent: true }.
   * Providers that need a human to trigger delivery (e.g. a wa.me deep
   * link with no send API) return a `url` for the UI to surface instead.
   *
   * @param {{ order: Object, shop: { businessName: string, whatsappNumber: string|null } }} params
   * @returns {Promise<{ sent: boolean, url?: string, reason?: string }>}
   */
  async notifyShop(_params) {
    throw new Error('Not implemented')
  }
}
