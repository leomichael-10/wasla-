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
