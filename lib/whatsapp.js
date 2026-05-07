import twilio from 'twilio'

let client = null

function getClient() {
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  }
  return client
}

/**
 * Send a WhatsApp message via Twilio.
 * Non-critical — errors are logged but never thrown.
 *
 * @param {string} to   - Recipient in format 'whatsapp:+971XXXXXXXXX'
 * @param {string} body - Message text
 */
export async function sendWhatsApp(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_WHATSAPP_FROM) {
    console.warn('[WhatsApp] Twilio env vars not configured — skipping.')
    return
  }
  try {
    await getClient().messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to,
      body,
    })
  } catch (err) {
    console.error('[WhatsApp] Failed to send message:', err?.message ?? err)
  }
}
