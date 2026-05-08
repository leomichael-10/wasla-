import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'PENDING'

  const items = await prisma.retailerProduct.findMany({
    where:   status === 'all' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    include: {
      masterProduct: { select: { id: true, name: true, images: true } },
      retailer:      { select: { id: true, businessName: true, city: true } },
    },
  })
  return NextResponse.json({ items: JSON.parse(JSON.stringify(items)) })
}
