import twilio from 'twilio'
import { VerificationProvider } from './VerificationProvider'
import { isSendRateLimited, issueCode, checkCode } from './core'

function twilioVerifyConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  )
}

let client = null
function getClient() {
  if (!client) client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  return client
}

/**
 * Shop WhatsApp-number verification. Prefers Twilio Verify (an approved
 * WhatsApp Business API account + TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/
 * TWILIO_VERIFY_SERVICE_SID) — Twilio owns code generation/expiry/delivery
 * for that path, so our own core isn't used there. HARD STOP for going
 * live: this requires an approved Twilio Verify service, which only the
 * account owner can set up — see DECISIONS.md for exactly what to
 * provision. Until then, falls back to our own core (generate/hash/store/
 * rate-limit) and logs the code to the server console so the flow is
 * fully testable in dev.
 */
export class WhatsAppOtpProvider extends VerificationProvider {
  get channel() { return 'whatsapp' }

  async requestCode({ target, purpose = 'shop_onboarding' }) {
    if (await isSendRateLimited(this.channel, target)) {
      return { sent: false, reason: 'rate_limited' }
    }

    if (twilioVerifyConfigured()) {
      try {
        await getClient().verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({ to: `whatsapp:+${target}`, channel: 'whatsapp' })
        return { sent: true }
      } catch (err) {
        console.error('[WhatsAppOtp/Twilio] send failed:', err?.message ?? err)
        return { sent: false, reason: 'provider_error' }
      }
    }

    // Stub: no approved WhatsApp Business API account configured.
    const code = await issueCode(this.channel, target, purpose)
    console.warn(
      `[WhatsAppOtp/STUB] No Twilio Verify credentials configured — ` +
      `would send WhatsApp OTP to +${target}. Dev code: ${code}`
    )
    return { sent: false, stubbed: true, devCode: code }
  }

  async checkCode({ target, code, purpose = 'shop_onboarding' }) {
    if (twilioVerifyConfigured()) {
      try {
        const result = await getClient().verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: `whatsapp:+${target}`, code: String(code) })
        return result.status === 'approved'
          ? { valid: true }
          : { valid: false, reason: 'wrong_code' }
      } catch (err) {
        console.error('[WhatsAppOtp/Twilio] check failed:', err?.message ?? err)
        return { valid: false, reason: 'provider_error' }
      }
    }

    return checkCode(this.channel, target, purpose, code)
  }
}
