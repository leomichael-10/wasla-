import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { CATALOGUE_WHERE } from '../../../lib/catalogue'

// GET /api/shops — public list of approved, open shops. Closed shops are left
// out: the catalogue already hides their products everywhere, so a listed
// closed shop would send customers to an empty page.
export async function GET() {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where:   { approvedByAdmin: true, sellerType: 'SHOP', isOpen: true },
      orderBy: { businessName: 'asc' },
      include: { reviews: { select: { rating: true } } },
    })

    // productCount is the catalogue count — the same products /products and
    // /shops/[id] show — not every active row, so the number matches the page.
    const visible = await prisma.product.findMany({
      where:  { ...CATALOGUE_WHERE, sellerId: { in: sellers.map(s => s.id) } },
      select: { sellerId: true },
    })
    const productCounts = {}
    for (const p of visible) productCounts[p.sellerId] = (productCounts[p.sellerId] ?? 0) + 1

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
        productCount:      productCounts[s.id] ?? 0,
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
