import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/seller/products
// Seller only (middleware enforces role). Returns the authenticated seller's
// own products — including inactive ones — for use in the dashboard.
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: auth.userId },
    })
    if (!sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    const products = await prisma.product.findMany({
      where:   { sellerId: sellerProfile.id },
      include: {
        category:    { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        variants:    { select: { id: true, label: true, price: true, stockQty: true }, orderBy: { price: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products: JSON.parse(JSON.stringify(products)) })
  } catch (error) {
    console.error('GET /api/seller/products error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
