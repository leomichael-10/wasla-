import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/shops — public list of all approved seller profiles
export async function GET() {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where:   { approvedByAdmin: true, sellerType: 'SHOP' },
      orderBy: { businessName: 'asc' },
      include: {
        reviews:  { select: { rating: true } },
        products: { where: { isActive: true }, select: { id: true } },
      },
    })

    const shops = sellers.map(s => {
      const avg = s.reviews.length
        ? s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length
        : 0
      return {
        id:                s.id,
        businessName:      s.businessName,
        logoUrl:           s.logoUrl,
        city:              s.city,
        area:              s.area,
        workingDays:       s.workingDays,
        workingHours:      s.workingHours,
        deliveryAvailable: s.deliveryAvailable,
        warrantyAvailable: s.warrantyAvailable,
        approvedByAdmin:   s.approvedByAdmin,
        productCount:      s.products.length,
        reviewCount:       s.reviews.length,
        averageRating:     Math.round(avg * 10) / 10,
      }
    })

    return NextResponse.json({ shops })
  } catch (error) {
    console.error('GET /api/shops error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
