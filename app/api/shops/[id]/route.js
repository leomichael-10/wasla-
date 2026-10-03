import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { CATALOGUE_WHERE, CATALOGUE_INCLUDE, toCatalogueProducts } from '../../../../lib/catalogue'

// GET /api/shops/[id] — one shop's page. Its product list is the same
// catalogue /api/products serves (lib/catalogue.js), scoped to this shop,
// so a shop page and /products can never disagree about what's for sale.
export async function GET(request, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid shop ID' }, { status: 400 })

  try {
    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        trackingPixel: { select: { id: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take:    20,
          include: {
            customer: {
              include: { customerProfile: { select: { fullName: true } } },
            },
          },
        },
      },
    })

    if (!seller) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const avg = seller.reviews.length
      ? seller.reviews.reduce((s, r) => s + r.rating, 0) / seller.reviews.length
      : 0

    // Every order placed at this shop that wasn't cancelled — i.e. one the
    // shop has actually received. (Counting DELIVERED alone read as "0
    // orders" for a shop with a live order in flight.)
    const orderCount = await prisma.order.count({
      where: { sellerId: seller.id, status: { not: 'CANCELLED' } },
    })

    const rows = await prisma.product.findMany({
      where:   { ...CATALOGUE_WHERE, sellerId: seller.id },
      include: CATALOGUE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    const products = toCatalogueProducts(rows)

    return NextResponse.json({
      shop: JSON.parse(JSON.stringify({
        id:                   seller.id,
        businessName:         seller.businessName,
        logoUrl:              seller.logoUrl,
        city:                 seller.city,
        area:                 seller.area,
        deliveryAvailable:    seller.deliveryAvailable,
        warrantyAvailable:    seller.warrantyAvailable,
        warrantyDuration:     seller.warrantyDuration,
        workingDays:          seller.workingDays,
        workingHours:         seller.workingHours,
        maintenanceAvailable: seller.maintenanceAvailable,
        approvedByAdmin:      seller.approvedByAdmin,
        subscriptionStatus:   seller.subscriptionStatus,
        isOpen:               seller.isOpen,
        averageRating:        Math.round(avg * 10) / 10,
        reviewCount:          seller.reviews.length,
        orderCount,
        reviews:              seller.reviews,
        trackingPixel:        seller.trackingPixel,
        products,
        productCount:         products.length,
      })),
    })
  } catch (error) {
    console.error('GET /api/shops/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
