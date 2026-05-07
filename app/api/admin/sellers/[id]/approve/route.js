import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { getUser } from '../../../../../../lib/auth'

export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: rawId } = await params
  const sellerId = parseInt(rawId, 10)
  if (isNaN(sellerId)) {
    return NextResponse.json({ error: 'Invalid seller ID.' }, { status: 400 })
  }

  try {
    const seller = await prisma.sellerProfile.update({
      where: { id: sellerId },
      data:  { approvedByAdmin: true },
      include: {
        user: { select: { id: true, email: true } },
      },
    })
    return NextResponse.json({ seller })
  } catch {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 })
  }
}
