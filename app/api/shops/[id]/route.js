import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

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
        orders: {
          where:  { status: 'DELIVERED' },
          select: { id: true },
        },
      },
    })

    if (!seller) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const avg = seller.reviews.length
      ? seller.reviews.reduce((s, r) => s + r.rating, 0) / seller.reviews.length
      : 0

    const base = {
      id:                  seller.id,
      businessName:        seller.businessName,
      city:                seller.city,
      area:                seller.area,
      deliveryAvailable:   seller.deliveryAvailable,
      warrantyAvailable:   seller.warrantyAvailable,
      warrantyDuration:    seller.warrantyDuration,
      workingDays:         seller.workingDays,
      workingHours:        seller.workingHours,
      maintenanceAvailable:seller.maintenanceAvailable,
      approvedByAdmin:     seller.approvedByAdmin,
      subscriptionStatus:  seller.subscriptionStatus,
      isOpen:              seller.isOpen,
      averageRating:       Math.round(avg * 10) / 10,
      reviewCount:         seller.reviews.length,
      completedOrders:     seller.orders.length,
      reviews:             seller.reviews,
      trackingPixel:       seller.trackingPixel,
    }

    if (seller.subscriptionStatus !== 'ACTIVE') {
      return NextResponse.json({ shop: { ...base, comingSoon: true, products: [], productCount: 0 } })
    }

    const retailerProducts = await prisma.retailerProduct.findMany({
      where:   { retailerId: seller.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      include: {
        masterProduct: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    })

    const products = retailerProducts.map(rp => ({
      id:          rp.id,
      name:        rp.masterProduct.name,
      description: rp.masterProduct.description,
      images:      rp.masterProduct.images,
      category:    rp.masterProduct.category,
      seller:      { id: seller.id, businessName: seller.businessName, city: seller.city, isOpen: seller.isOpen },
      variants: [{
        id:       rp.id,
        price: rp.price,
        label:    null,
        inStock:  rp.stockQty > 0,
      }],
      _isRetailerProduct: true,
    }))

    return NextResponse.json({
      shop: JSON.parse(JSON.stringify({
        ...base,
        comingSoon:   false,
        products,
        productCount: products.length,
      })),
    })
  } catch (error) {
    console.error('GET /api/shops/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
