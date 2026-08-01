import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'
import { isBlocked } from '../../../../../lib/wallet'

// GET /api/admin/wallets/:sellerId — admin only. One shop's wallet + full ledger.
export async function GET(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { sellerId: rawId } = await params
  const sellerId = parseInt(rawId, 10)
  if (isNaN(sellerId)) {
    return NextResponse.json({ error: 'Invalid seller id' }, { status: 400 })
  }

  try {
    const seller = await prisma.sellerProfile.findUnique({
      where:  { id: sellerId },
      select: { id: true, businessName: true, city: true, walletBalance: true },
    })
    if (!seller) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const ledger = await prisma.walletTransaction.findMany({
      where:   { shopId: sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { id: true, email: true } },
        order: { select: { id: true, status: true } },
      },
    })

    return NextResponse.json({
      wallet: JSON.parse(JSON.stringify({ ...seller, blocked: isBlocked(seller.walletBalance) })),
      ledger: JSON.parse(JSON.stringify(ledger)),
    })
  } catch (error) {
    console.error('GET /api/admin/wallets/[sellerId] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
