import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const requests = await prisma.productRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { retailer: { select: { id: true, businessName: true } } },
  })
  return NextResponse.json({ requests: JSON.parse(JSON.stringify(requests)) })
}
