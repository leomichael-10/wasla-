import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { getUser } from '../../../../../../lib/auth'
import { topUp } from '../../../../../../lib/wallet'

// POST /api/admin/wallets/:sellerId/topup — admin only. Body: { amount, note? }
export async function POST(request, { params }) {
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
    const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } })
    if (!seller) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const body = await request.json()
    const { amount, note } = body

    const { transaction, newBalance } = await topUp({ sellerId, amount, note, adminId: auth.userId })

    return NextResponse.json({
      transaction: JSON.parse(JSON.stringify(transaction)),
      balance: newBalance,
    }, { status: 201 })
  } catch (error) {
    if (error?.code === 'INVALID_AMOUNT') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('POST /api/admin/wallets/[sellerId]/topup error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
