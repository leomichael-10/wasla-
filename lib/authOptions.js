import GoogleProvider from 'next-auth/providers/google'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { sendWelcomeEmail } from './sendWelcomeEmail'

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
        const existing = await prisma.user.findUnique({ where: { email: profile.email } })

        if (!existing) {
          const created = await prisma.user.create({
            data: {
              email:           profile.email,
              passwordHash:    null,
              role:            'customer',
              isOnboarded:     true,
              customerProfile: { create: { fullName: profile.name ?? '' } },
            },
          })
          // First-time Google signup never hits app/api/auth/register/route.js,
          // so the welcome email is sent here instead — always the customer
          // template, since Google sign-in only ever creates customers (see
          // the register page: "Sign up with Google" isn't offered in seller
          // mode). Never re-sent on subsequent logins (the `!existing` guard
          // above only runs this branch once, at creation).
          await sendWelcomeEmail(created)
        } else if (!existing.isOnboarded) {
          await prisma.user.update({
            where: { email: profile.email },
            data:  { isOnboarded: true },
          })
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
