import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma'

const rateLimitMap = new Map()
function isRateLimited(ip) {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { email, password, role, phone, whatsapp, city, gender } = body

    // Check all required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['customer', 'retailer', 'wholesaler']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        phone,
        whatsapp,
        city,
        gender,
      }
    })

    // If customer, create customer profile
    if (role === 'customer') {
      await prisma.customerProfile.create({
        data: { userId: user.id }
      })
    }

    // If seller, create seller profile.
    // Subscriptions are shelved for launch (NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=false) —
    // every shop starts on the free tier instead of waiting on a subscription payment.
    if (role === 'retailer' || role === 'wholesaler') {
      const { businessName } = body
      const subscriptionsEnabled = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === 'true'
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          businessName: businessName || 'My Shop',
          approvedByAdmin: false,
          subscriptionStatus: subscriptionsEnabled ? 'PENDING' : 'ACTIVE',
        }
      })
    }

    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}