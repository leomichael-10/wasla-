import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/admin/stats — admin only, returns platform analytics
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const [
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
      revenueAgg,
      orderItemsByVariant,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.sellerProfile.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalAed: true },
        where: { status: 'delivered' },
      }),
      prisma.orderItem.groupBy({
        by:      ['productVariantId'],
        _sum:    { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
      }),
    ])

    const totalRevenue = Number(revenueAgg._sum.totalAed ?? 0)

    // Map variant → product units sold
    const variantIds = orderItemsByVariant.map(r => r.productVariantId)
    const variantCountMap = Object.fromEntries(
      orderItemsByVariant.map(r => [r.productVariantId, r._sum.quantity ?? 0])
    )

    // Fetch those variants + their products
    const variants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where:   { id: { in: variantIds } },
          include: { product: { include: { category: { select: { name: true } } } } },
        })
      : []

    // Aggregate units by product
    const productUnitMap = {}
    for (const v of variants) {
      const pid   = v.productId
      const units = variantCountMap[v.id] ?? 0
      productUnitMap[pid] = {
        productId:    pid,
        productName:  v.product.name,
        brand:        v.product.brand,
        categoryName: v.product.category?.name,
        sellerId:     v.product.sellerId,
        units:       (productUnitMap[pid]?.units ?? 0) + units,
      }
    }

    const productRanking = Object.values(productUnitMap).sort((a, b) => b.units - a.units)

    const bestSelling = productRanking[0] ?? null
    const topProducts = productRanking.slice(0, 5)

    // Top sellers by revenue
    const revenueBySellerRaw = await prisma.order.groupBy({
      by:      ['sellerId'],
      _sum:    { totalAed: true },
      where:   { status: 'delivered' },
      orderBy: { _sum: { totalAed: 'desc' } },
      take:    5,
    })

    const topSellerIds      = revenueBySellerRaw.map(r => r.sellerId)
    const topSellerProfiles = topSellerIds.length > 0
      ? await prisma.sellerProfile.findMany({
          where:   { id: { in: topSellerIds } },
          select:  { id: true, businessName: true, city: true },
        })
      : []

    const sellerMap = Object.fromEntries(topSellerProfiles.map(s => [s.id, s]))
    const topSellers = revenueBySellerRaw.map(r => ({
      sellerId:     r.sellerId,
      businessName: sellerMap[r.sellerId]?.businessName ?? 'Unknown',
      city:         sellerMap[r.sellerId]?.city ?? null,
      revenueAed:   Number(r._sum.totalAed ?? 0),
    }))

    return NextResponse.json({
      totals: {
        users:    totalUsers,
        sellers:  totalSellers,
        products: totalProducts,
        orders:   totalOrders,
        revenue:  totalRevenue,
      },
      bestSelling,
      topProducts,
      topSellers,
    })
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
