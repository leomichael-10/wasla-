import GoogleProvider from 'next-auth/providers/google'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { sendWelcomeEmail } from './sendWelcomeEmail'
import { SIGNUP_INTENT_COOKIE } from './googleSignupIntent'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account.provider !== 'google') return true

      try {
        // Consumed once per Google callback, regardless of outcome, so an
        // abandoned seller attempt (e.g. cancelled on Google's consent
        // screen) can never leak into a later, unrelated sign-in on the
        // same browser — see lib/googleSignupIntent.js for why a cookie
        // is the right carrier here.
        const cookieStore = await cookies()
        const wantsSeller = cookieStore.get(SIGNUP_INTENT_COOKIE)?.value === 'seller'
        try { cookieStore.delete(SIGNUP_INTENT_COOKIE) } catch { /* best-effort */ }

        const existing = await prisma.user.findUnique({
          where:   { email: profile.email },
          include: { sellerProfile: { select: { whatsappNumber: true } } },
        })

        if (!existing) {
          const subscriptionsEnabled = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === 'true'

          // Google never gives us a business name/WhatsApp number, so a
          // seller signing up this way still needs the same details the
          // email/password flow collects at signup (see
          // app/api/auth/register/route.js) — isOnboarded stays false so
          // app/auth/redirect/page.js detours them through /onboarding
          // before they can reach /dashboard with a half-built profile.
          const created = wantsSeller
            ? await prisma.user.create({
                data: {
                  email:        profile.email,
                  passwordHash: null,
                  role:         'retailer',
                  isOnboarded:  false,
                  sellerProfile: {
                    create: {
                      businessName:       'My Shop',
                      sellerType:         'SHOP',
                      approvedByAdmin:    false,
                      subscriptionStatus: subscriptionsEnabled ? 'PENDING' : 'ACTIVE',
                    },
                  },
                },
              })
            : await prisma.user.create({
                data: {
                  email:           profile.email,
                  passwordHash:    null,
                  role:            'customer',
                  isOnboarded:     true,
                  customerProfile: { create: { fullName: profile.name ?? '' } },
                },
              })

          // First-time Google signup never hits app/api/auth/register/route.js,
          // so the welcome email is sent here instead. sendWelcomeEmail()
          // already branches on created.role for the subject/copy (seller
          // pending-approval vs customer). Never re-sent on subsequent
          // logins (the `!existing` guard above only runs this once, at
          // creation).
          await sendWelcomeEmail(created)
        } else if (!existing.isOnboarded) {
          // Signing in with Google must never change an existing account's
          // role (handled above — this branch never touches `role`). It
          // also must not wave through a seller who was created via this
          // same Google flow but never finished /onboarding: an
          // email/password seller always has sellerProfile.whatsappNumber
          // set (required at registration), so its absence reliably means
          // "still mid-onboarding," not "different signup method." Only
          // flip isOnboarded here for accounts that don't need that gate.
          const isIncompleteSeller =
            (existing.role === 'retailer' || existing.role === 'wholesaler') &&
            !existing.sellerProfile?.whatsappNumber

          if (!isIncompleteSeller) {
            await prisma.user.update({
              where: { email: profile.email },
              data:  { isOnboarded: true },
            })
          }
        }

        return true
      } catch (err) {
        console.error('[NextAuth signIn]', err)
        return false
      }
    },

    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        try {
          const user = await prisma.user.findUnique({ where: { email: profile.email } })

          if (user) {
            token.customToken  = jwt.sign(
              { userId: user.id, email: user.email, role: user.role, isBanned: user.isBanned },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
            )
            token.userId      = user.id
            token.role        = user.role
            token.userEmail   = user.email
            token.isOnboarded = user.isOnboarded
          }
        } catch (err) {
          console.error('[NextAuth jwt]', err)
        }
      }
      return token
    },

    async session({ session, token }) {
      session.customToken          = token.customToken
      session.user.userId          = token.userId
      session.user.role            = token.role
      session.user.email           = token.userEmail ?? session.user.email
      session.user.isOnboarded     = token.isOnboarded
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  session: { strategy: 'jwt' },
}
