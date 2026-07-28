import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/dashboard/earnings — seller only
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
    if (!sellerProfile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })

    const now       = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart  = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const deliveredOrders = await prisma.order.findMany({
      where: { sellerId: sellerProfile.id, status: 'delivered' },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: { select: { id: true, name: true, brand: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalRevenue  = deliveredOrders.reduce((s, o) => s + Number(o.totalAed), 0)
    const monthRevenue  = deliveredOrders
      .filter(o => new Date(o.createdAt) >= monthStart)
      .reduce((s, o) => s + Number(o.totalAed), 0)
    const weekRevenue   = deliveredOrders
      .filter(o => new Date(o.createdAt) >= weekStart)
      .reduce((s, o) => s + Number(o.totalAed), 0)
    const todayRevenue  = deliveredOrders
      .filter(o => new Date(o.createdAt) >= todayStart)
      .reduce((s, o) => s + Number(o.totalAed), 0)

    // Group revenue by date for chart (last 30 days)
    const chartData = []
    for (let i = 29; i >= 0; i--) {
      const d     = new Date(todayStart); d.setDate(todayStart.getDate() - i)
      const dNext = new Date(d); dNext.setDate(d.getDate() + 1)
      const label = d.toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })
      const rev   = deliveredOrders
        .filter(o => {
          const oc = new Date(o.createdAt)
          return oc >= d && oc < dNext
        })
        .reduce((s, o) => s + Number(o.totalAed), 0)
      chartData.push({ date: label, revenue: rev })
    }

    // Top selling products
    const unitMap  = {}
    const nameMap  = {}
    for (const o of deliveredOrders) {
      for (const item of o.items) {
        const pid = item.productVariant?.product?.id
        if (!pid) continue
        unitMap[pid]  = (unitMap[pid]  || 0) + item.quantity
        nameMap[pid]  = item.productVariant?.product?.name ?? `Product ${pid}`
      }
    }
    const topProducts = Object.entries(unitMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, units]) => ({ id: Number(id), name: nameMap[id], units }))

    // Top selling variants (by label)
    const labelMap = {}
    for (const o of deliveredOrders) {
      for (const item of o.items) {
        const label = item.productVariant?.label || 'Unknown'
        labelMap[label] = (labelMap[label] || 0) + item.quantity
      }
    }
    const topVariants = Object.entries(labelMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, units]) => ({ label, units }))

    return NextResponse.json({
      totalRevenue,
      monthRevenue,
      weekRevenue,
      todayRevenue,
      chartData,
      topProducts,
      topVariants,
      orders: JSON.parse(JSON.stringify(deliveredOrders)),
    })
  } catch (error) {
    console.error('GET /api/dashboard/earnings error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
