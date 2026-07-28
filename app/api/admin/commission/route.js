import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/admin/commission — admin only
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const allOrders = await prisma.order.findMany({
      where: { status: 'delivered' },
      include: {
        seller: { select: { id: true, businessName: true } },
      },
    })

    const totalCommission = allOrders.reduce((s, o) => s + Number(o.commission), 0)
    const monthCommission = allOrders
      .filter(o => new Date(o.createdAt) >= monthStart)
      .reduce((s, o) => s + Number(o.commission), 0)

    // Group by seller
    const sellerMap = {}
    for (const o of allOrders) {
      const sid = o.sellerId
      if (!sellerMap[sid]) {
        sellerMap[sid] = {
          sellerId:     sid,
          sellerName:   o.seller?.businessName ?? `Seller ${sid}`,
          totalOrders:  0,
          totalRevenue: 0,
          totalCommission: 0,
        }
      }
      sellerMap[sid].totalOrders++
      sellerMap[sid].totalRevenue    += Number(o.total)
      sellerMap[sid].totalCommission += Number(o.commission)
    }

    const bySeller = Object.values(sellerMap).sort((a, b) => b.totalCommission - a.totalCommission)

    // Group by month (last 12 months)
    const byMonth = []
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const label  = mStart.toLocaleDateString('en-AE', { month: 'short', year: 'numeric' })
      const rev    = allOrders
        .filter(o => {
          const oc = new Date(o.createdAt)
          return oc >= mStart && oc < mEnd
        })
        .reduce((s, o) => s + Number(o.commission), 0)
      byMonth.push({ month: label, commission: rev })
    }

    return NextResponse.json({ totalCommission, monthCommission, bySeller, byMonth })
  } catch (error) {
    console.error('GET /api/admin/commission error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
