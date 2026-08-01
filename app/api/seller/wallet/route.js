import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { isBlocked, CREDIT_LIMIT } from '../../../../lib/wallet'

// GET /api/seller/wallet — the logged-in seller's OWN wallet + ledger only.
// Scoped by userId -> sellerProfile, same as every other /api/seller/* route
// in this app; a shop can never pass another shop's id to read its wallet.
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  try {
    const seller = await prisma.sellerProfile.findUnique({
      where:  { userId: auth.userId },
      select: { id: true, walletBalance: true },
    })
    if (!seller) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    const ledger = await prisma.walletTransaction.findMany({
      where:   { shopId: seller.id },
      orderBy: { createdAt: 'desc' },
      select:  {
        id: true, amount: true, type: true, balanceAfter: true,
        orderId: true, note: true, createdAt: true,
      },
    })

    return NextResponse.json({
      wallet: {
        balance:     JSON.parse(JSON.stringify(seller.walletBalance)),
        blocked:     isBlocked(seller.walletBalance),
        creditLimit: CREDIT_LIMIT,
      },
      ledger: JSON.parse(JSON.stringify(ledger)),
    })
  } catch (error) {
    console.error('GET /api/seller/wallet error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
