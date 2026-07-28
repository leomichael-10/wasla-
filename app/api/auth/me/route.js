import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id:             true,
        email:          true,
        role:           true,
        phone:          true,
        whatsapp:       true,
        city:           true,
        gender:         true,
        createdAt:      true,
        customerProfile: {
          select: {
            id:              true,
            fullName:        true,
            deliveryAddress: true,
            reviewerScore:   true,
          },
        },
        sellerProfile: {
          select: {
            id:                   true,
            businessName:         true,
            tradeLicense:         true,
            city:                 true,
            area:                 true,
            workingDays:          true,
            workingHours:         true,
            deliveryAvailable:    true,
            warrantyAvailable:    true,
            maintenanceAvailable: true,
            approvedByAdmin:      true,
            createdAt:            true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('GET /api/auth/me error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
