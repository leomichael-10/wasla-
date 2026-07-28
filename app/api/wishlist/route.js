import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'

const PRODUCT_SELECT = {
  id:       true,
  name:     true,
  brand:    true,
  images:   true,
  isActive: true,
  seller:   { select: { id: true, businessName: true, city: true } },
  category: { select: { id: true, name: true } },
  variants: {
    select:  { id: true, priceAed: true, label: true, stockQty: true },
    orderBy: { label: 'asc' },
  },
}

// GET /api/wishlist — customer's wishlist
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'customer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const items = await prisma.wishlist.findMany({
      where:   { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: PRODUCT_SELECT } },
    })

    return NextResponse.json({
      wishlist: items.map(i => ({
        wishlistId: i.id,
        ...JSON.parse(JSON.stringify(i.product)),
      })),
    })
  } catch (error) {
    console.error('GET /api/wishlist error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/wishlist — add product (idempotent)
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'customer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { productId } = await request.json()
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })

    const item = await prisma.wishlist.upsert({
      where:  { userId_productId: { userId: auth.userId, productId: parseInt(productId, 10) } },
      create: { userId: auth.userId, productId: parseInt(productId, 10) },
      update: {},
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('POST /api/wishlist error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/wishlist — remove product
export async function DELETE(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'customer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { productId } = await request.json()
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })

    await prisma.wishlist.deleteMany({
      where: { userId: auth.userId, productId: parseInt(productId, 10) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/wishlist error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
