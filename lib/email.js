import nodemailer from 'nodemailer'

let transporter = null
let resendClient = null

function getTransporter() {
  // Always recreate so env vars picked up after hot-reload
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls:{
          rejectUnauthorized: false

      }
    })
  }
  return transporter
}

async function getResendClient() {
  if (!resendClient) {
    const { Resend } = await import('resend')
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

/**
 * Send an email. Non-critical — errors are logged but never thrown.
 *
 * Prefers Resend (RESEND_API_KEY) when configured — it's the intended
 * transactional pipeline going forward. Falls back to the pre-existing
 * SMTP/nodemailer path when Resend isn't configured, rather than a bare
 * no-op stub, since that path already works in production. If neither is
 * configured, skips and logs a warning.
 *
 * @param {string} to      - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html    - HTML body
 * @param {string} [text]  - Plain-text fallback (some clients block HTML
 *                           entirely and score HTML-only mail as spam)
 */
export async function sendEmail(to, subject, html, text) {
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = await getResendClient()
      const { error } = await resend.emails.send({
        from:    process.env.RESEND_FROM ?? 'Wasla <onboarding@resend.dev>',
        to,
        subject,
        html,
        ...(text ? { text } : {}),
      })
      if (error) console.error('[Email/Resend] Failed to send email:', error)
      return
    } catch (err) {
      console.error('[Email/Resend] Failed to send email:', err?.message ?? err)
      return
    }
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] Neither RESEND_API_KEY nor SMTP env vars are configured — skipping.')
    return
  }
  try {
    await getTransporter().sendMail({
      from:    process.env.EMAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    })
  } catch (err) {
    console.error('[Email/SMTP] Failed to send email:', err?.message ?? err)
  }
}
