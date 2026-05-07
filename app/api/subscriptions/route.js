import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { sendEmail } from '../../../lib/email'
import { subscriptionConfirmation } from '../../../lib/emailTemplates'

// GET /api/subscriptions
// Seller: returns their current (latest) subscription
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: auth.userId },
    })
    if (!sellerProfile) {
      return NextResponse.json({ subscription: null })
    }

    const subscription = await prisma.subscription.findFirst({
      where:   { sellerId: sellerProfile.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('GET /api/subscriptions error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/subscriptions
// Seller: create a new subscription (always AED 199)
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body          = await request.json()
    const { paymentMethod } = body

    if (!paymentMethod) {
      return NextResponse.json({ error: 'paymentMethod is required' }, { status: 400 })
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: auth.userId },
    })
    if (!sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    // Block if active subscription already exists
    const existing = await prisma.subscription.findFirst({
      where: { sellerId: sellerProfile.id, status: 'active' },
    })
    if (existing) {
      return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 })
    }

    const subscription = await prisma.subscription.create({
      data: {
        sellerId:      sellerProfile.id,
        priceAed:      199,
        status:        'pending',
        paymentMethod,
        paymentStatus: 'unpaid',
      },
    })

    // Send confirmation email
    const userRecord = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (userRecord?.email) {
      sendEmail(
        userRecord.email,
        'Tobaki — Subscription received',
        subscriptionConfirmation(sellerProfile.businessName, 199)
      )
    }

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error('POST /api/subscriptions error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
