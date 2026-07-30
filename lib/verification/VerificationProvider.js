/**
 * Common interface for ownership-verification channels (email, WhatsApp).
 * Mirrors lib/payments/PaymentProvider.js's shape. Channels differ only in
 * delivery — the shared expiry/single-use/rate-limit/lockout rules live in
 * lib/verification/core.js and are used by every channel that has no
 * external OTP service of its own (see whatsappOtp.js for the one that does).
 */
export class VerificationProvider {
  get channel() {
    throw new Error('VerificationProvider subclasses must implement get channel()')
  }

  /**
   * @param {{ target: string, purpose?: string }} params
   * @returns {Promise<{ sent: boolean, stubbed?: boolean, devCode?: string, reason?: string }>}
   */
  async requestCode(_params) {
    throw new Error('Not implemented')
  }

  /**
   * @param {{ target: string, code: string, purpose?: string }} params
   * @returns {Promise<{ valid: boolean, reason?: string, attemptsLeft?: number }>}
   */
  async checkCode(_params) {
    throw new Error('Not implemented')
  }
}
