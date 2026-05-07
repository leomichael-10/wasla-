import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { sanitizeString, sanitizeEmail } from '../../../lib/sanitize'

// PATCH /api/profile
// Protected. Updates user and customerProfile fields.
// Never updates email, passwordHash, or role.
export async function PATCH(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await request.json()
    const { fullName, phone, whatsapp, city, gender, deliveryAddress } = body

    // Update top-level user fields (excluding email/password/role)
    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        phone:    phone    !== undefined ? sanitizeString(phone, 30)    : undefined,
        whatsapp: whatsapp !== undefined ? sanitizeString(whatsapp, 30) : undefined,
        city:     city     !== undefined ? sanitizeString(city, 100)    : undefined,
        gender:   gender   !== undefined ? sanitizeString(gender, 20)   : undefined,
      },
    })

    // Update customer profile if customer
    if (auth.role === 'customer') {
      const updateData = {}
      if (fullName        !== undefined) updateData.fullName        = sanitizeString(fullName, 150)
      if (deliveryAddress !== undefined) updateData.deliveryAddress = sanitizeString(deliveryAddress, 500)

      if (Object.keys(updateData).length > 0) {
        await prisma.customerProfile.upsert({
          where:  { userId: auth.userId },
          update: updateData,
          create: { userId: auth.userId, ...updateData },
        })
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where:   { id: auth.userId },
      include: { customerProfile: true },
      select:  {
        id: true, email: true, role: true, phone: true,
        whatsapp: true, city: true, gender: true,
        customerProfile: {
          select: { fullName: true, deliveryAddress: true },
        },
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('PATCH /api/profile error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET /api/profile — return current user profile
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true, email: true, role: true, phone: true,
        whatsapp: true, city: true, gender: true, ageVerified: true,
        customerProfile: {
          select: { fullName: true, deliveryAddress: true },
        },
        sellerProfile: {
          select: { businessName: true, city: true, area: true, workingHours: true, deliveryAvailable: true },
        },
      },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('GET /api/profile error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
