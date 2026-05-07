import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/admin/subscriptions — admin only, returns all subscriptions
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        seller: {
          select: {
            id:          true,
            businessName: true,
            city:        true,
            user:        { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ subscriptions: JSON.parse(JSON.stringify(subscriptions)) })
  } catch (error) {
    console.error('GET /api/admin/subscriptions error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
