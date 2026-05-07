import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// GET /api/shops/:id — public seller profile with products and reviews
export async function GET(request, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid shop ID' }, { status: 400 })

  try {
    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true } },
        products: {
          where:   { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            category:    { select: { id: true, name: true } },
            variants: {
              select:  { id: true, flavor: true, priceAed: true, stockQty: true, puffCount: true, nicotineLevel: true, isActive: true },
              orderBy: { flavor: 'asc' },
            },
            seller: { select: { id: true, businessName: true, city: true } },
            _count:  { select: { reviews: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take:    20,
          include: {
            customer: {
              include: { customerProfile: { select: { fullName: true } } },
            },
          },
        },
        orders: {
          where:  { status: 'delivered' },
          select: { id: true },
        },
      },
    })

    if (!seller) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const avg = seller.reviews.length
      ? seller.reviews.reduce((s, r) => s + r.rating, 0) / seller.reviews.length
      : 0

    const payload = JSON.parse(JSON.stringify({
      ...seller,
      user:            undefined,
      averageRating:   Math.round(avg * 10) / 10,
      reviewCount:     seller.reviews.length,
      productCount:    seller.products.length,
      completedOrders: seller.orders.length,
      orders:          undefined,
      products: seller.products.map(p => ({
        ...p,
        variants: p.variants.map(({ stockQty, isActive, ...v }) => ({
          ...v,
          inStock: stockQty > 0,
        })),
      })),
    }))
    delete payload.orders
    delete payload.user

    return NextResponse.json({ shop: payload })
  } catch (error) {
    console.error('GET /api/shops/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
