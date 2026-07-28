import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/admin/users — admin only
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const role   = searchParams.get('role')   || ''
  const search = searchParams.get('search') || ''

  try {
    const where = {}
    if (role)   where.role  = role
    if (search) where.email = { contains: search.toLowerCase(), mode: 'insensitive' }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        email:       true,
        role:        true,
        city:        true,
        isBanned:    true,
        createdAt:   true,
        customerProfile: { select: { fullName: true } },
        sellerProfile:   { select: { businessName: true, approvedByAdmin: true } },
        _count:          { select: { orders: true } },
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('GET /api/admin/users error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
