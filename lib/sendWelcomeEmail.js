import { prisma } from './prisma'
import { sendEmail } from './email'
import { welcomeCustomerEmail, welcomeSellerEmail } from './emailTemplates'

/**
 * Send the once-per-account welcome email, right after account creation.
 * Called from both signup paths — app/api/auth/register/route.js and the
 * Google OAuth first-time signIn in lib/authOptions.js — since an OAuth
 * user never hits the register route.
 *
 * Never throws: a failed send (bad SMTP host, provider outage, etc.) must
 * not break account creation. welcomeEmailSentAt is stamped regardless of
 * whether the send actually succeeded — sendEmail() already swallows and
 * logs its own errors, so by the time we get here "attempted" is the only
 * signal available, and re-attempting on a later login is explicitly out
 * of scope (never resend on login/profile update).
 *
 * @param {{ id: number, email: string, role: string }} user
 * @param {string} [businessName] - required for seller welcome copy
 */
export async function sendWelcomeEmail(user, businessName) {
  try {
    const isSeller = user.role === 'retailer' || user.role === 'wholesaler'
    const { subject, html, text } = isSeller
      ? welcomeSellerEmail({ businessName: businessName || 'متجرك' })
      : welcomeCustomerEmail()

    await sendEmail(user.email, subject, html, text)

    await prisma.user.update({
      where: { id: user.id },
      data:  { welcomeEmailSentAt: new Date() },
    })
  } catch (err) {
    // Belt-and-suspenders: sendEmail() already catches its own errors, but
    // the prisma.user.update above (or a bug here) must never bubble up
    // and fail the signup that's already succeeded.
    console.error('[Welcome email] Failed:', err?.message ?? err)
  }
}
