import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const sellers = await prisma.sellerProfile.findMany({
      include: {
        user: {
          select: { id: true, email: true, city: true, phone: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ sellers })
  } catch {
    return NextResponse.json({ error: 'Failed to load sellers.' }, { status: 500 })
  }
}
