import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { isBlocked } from '../../../../lib/wallet'

// GET /api/admin/wallets — admin only. Every shop's wallet balance, with
// blocked shops (balance <= -100) flagged so admin knows who to chase.
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const sellers = await prisma.sellerProfile.findMany({
      select: { id: true, businessName: true, city: true, walletBalance: true, isOpen: true },
      orderBy: { walletBalance: 'asc' },
    })

    const wallets = sellers.map(s => ({
      ...s,
      blocked: isBlocked(s.walletBalance),
    }))

    return NextResponse.json({ wallets: JSON.parse(JSON.stringify(wallets)) })
  } catch (error) {
    console.error('GET /api/admin/wallets error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
