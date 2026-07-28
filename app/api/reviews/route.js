import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { sanitizeString, sanitizeInt } from '../../../lib/sanitize'

// GET /api/reviews?sellerId=X  or  ?productId=X
// Public route — returns reviews with average rating
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const sellerId  = sanitizeInt(searchParams.get('sellerId'))
  const productId = sanitizeInt(searchParams.get('productId'))

  if (!sellerId && !productId) {
    return NextResponse.json({ error: 'sellerId or productId is required' }, { status: 400 })
  }

  try {
    const where = {}
    if (sellerId)  where.sellerId  = sellerId
    if (productId) where.productId = productId

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          include: { customerProfile: { select: { fullName: true } } },
        },
      },
    })

    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0

    return NextResponse.json({
      reviews:       JSON.parse(JSON.stringify(reviews)),
      averageRating: Math.round(avg * 10) / 10,
      count:         reviews.length,
    })
  } catch (error) {
    console.error('GET /api/reviews error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/reviews
// Customer only. Body: { sellerId, productId, rating, comment }
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'customer') {
    return NextResponse.json({ error: 'Only customers can post reviews' }, { status: 403 })
  }

  try {
    const body      = await request.json()
    const sellerId  = sanitizeInt(body.sellerId)
    const productId = sanitizeInt(body.productId)
    const rating    = sanitizeInt(body.rating, 1, 5)
    const comment   = sanitizeString(body.comment ?? '', 1000)

    if (!sellerId || !productId || !rating) {
      return NextResponse.json(
        { error: 'sellerId, productId, and rating (1–5) are required' },
        { status: 400 }
      )
    }

    // Verify the customer has a delivered order containing this product from this seller
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        customerId: auth.userId,
        sellerId,
        status: 'DELIVERED',
        items: {
          some: {
            productVariant: { productId },
          },
        },
      },
    })

    if (!deliveredOrder) {
      return NextResponse.json(
        { error: 'You can only review products you have purchased and received.' },
        { status: 403 }
      )
    }

    // One review per customer per product
    const existing = await prisma.review.findFirst({
      where: { customerId: auth.userId, productId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this product.' },
        { status: 409 }
      )
    }

    const review = await prisma.review.create({
      data: {
        customerId: auth.userId,
        sellerId,
        productId,
        rating,
        comment: comment || null,
      },
      include: {
        customer: {
          include: { customerProfile: { select: { fullName: true } } },
        },
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
