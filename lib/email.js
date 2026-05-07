import nodemailer from 'nodemailer'

let transporter = null

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

/**
 * Send an email. Non-critical — errors are logged but never thrown.
 *
 * @param {string} to      - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html    - HTML body
 */
export async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP env vars not configured — skipping.')
    return
  }
  try {
    await getTransporter().sendMail({
      from:    process.env.EMAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('[Email] Failed to send email:', err?.message ?? err)
  }
}
