import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../../lib/prisma'
import { authOptions } from '../../../../lib/authOptions'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Belt and braces, same reasoning as authOptions.js's signIn callback:
    // session.user.email is frozen at whatever it was when this NextAuth
    // session was first established (the jwt callback only re-derives it
    // on an actual sign-in, not on every session refresh), so a session
    // that predates this user deleting their account can outlive
    // passwordChangedAt by NextAuth's own session lifetime. In practice
    // that stale email can never match this now-anonymized row's
    // placeholder email either — this is a second, independent check on
    // top of that, not the only thing standing between a stale session
    // and a working token.
    if (user.deletedAt) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const customToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, isBanned: user.isBanned },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      customToken,
      user: { id: user.id, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error('[/api/auth/token]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
