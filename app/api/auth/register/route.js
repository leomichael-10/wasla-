import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma'
import { getVerificationProvider } from '../../../../lib/verification'
import { sendWelcomeEmail } from '../../../../lib/sendWelcomeEmail'
import { toE164 } from '../../../../lib/phone'

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

    // Sellers must supply a WhatsApp number — orders are sent there, so
    // without one the shop can't receive orders (see WaMeProvider).
    // Normalized here (not just client-side) so the DB never stores
    // anything but canonical E.164 — see lib/phone.js.
    let whatsappE164 = null
    if (role === 'retailer' || role === 'wholesaler') {
      whatsappE164 = toE164(body.whatsappNumber)
      if (!whatsappE164) {
        return NextResponse.json(
          { error: 'A valid whatsappNumber is required for shops (e.g. 01012345678 or +249…)' },
          { status: 400 }
        )
      }
    }

    // Optional generic phone (either role) — same rule: reject rather
    // than silently store a non-normalizable value.
    let phoneE164 = null
    if (phone) {
      phoneE164 = toE164(phone)
      if (!phoneE164) {
        return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
      }
    }

    // Business type (shop vs restaurant) — Phase 1 foundation only; SHOP
    // is the safe default for any caller that doesn't send it yet.
    const sellerType = body.sellerType === 'RESTAURANT' ? 'RESTAURANT' : 'SHOP'

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
        phone: phoneE164,
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
      const { businessName, whatsappNumber, sellerCity, sellerArea, description } = body
      const subscriptionsEnabled = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === 'true'
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          businessName: businessName || 'My Shop',
          whatsappNumber: whatsappE164,
          sellerType,
          city: sellerCity?.trim() || null,
          area: sellerArea?.trim() || null,
          // SellerProfile.description was split into descriptionAr/descriptionEn
          // (see prisma/schema.prisma) — registration only ever collects one
          // string today, so it goes into the Arabic field (Wasla is
          // Arabic-first; the seller-settings form is where descriptionEn
          // gets added later, once that UI exists).
          descriptionAr: description?.trim() || null,
          approvedByAdmin: false,
          subscriptionStatus: subscriptionsEnabled ? 'PENDING' : 'ACTIVE',
        }
      })
    }

    // Fire off the email verification code — never block registration if
    // sending fails (the user can always tap "resend" from /verify-email).
    try {
      await getVerificationProvider('email').requestCode({ target: user.email, purpose: 'signup' })
    } catch (err) {
      console.error('[Register] Failed to send verification code:', err?.message ?? err)
    }

    // Welcome email — once per account, never blocks signup on failure
    // (see lib/sendWelcomeEmail.js). Customer vs seller copy branches on
    // role; the Google OAuth first-time signup path (lib/authOptions.js)
    // calls the same function since it never hits this route.
    await sendWelcomeEmail(user, body.businessName)

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