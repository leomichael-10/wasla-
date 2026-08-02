import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/restaurants — public list of approved RESTAURANT sellers.
// Mirrors /api/shops but scoped to sellerType RESTAURANT so restaurants
// never mix into the shop directory or category browse.
export async function GET() {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where:   { sellerType: 'RESTAURANT', approvedByAdmin: true },
      orderBy: { businessName: 'asc' },
      include: {
        products: { where: { isActive: true }, select: { id: true, images: true } },
      },
    })

    const restaurants = sellers.map(s => ({
      id:           s.id,
      businessName: s.businessName,
      city:         s.city,
      area:         s.area,
      isOpen:       s.isOpen,
      image:        s.products.find(p => p.images?.length)?.images?.[0] ?? null,
      dishCount:    s.products.length,
    }))

    return NextResponse.json({ restaurants })
  } catch (error) {
    console.error('GET /api/restaurants error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
