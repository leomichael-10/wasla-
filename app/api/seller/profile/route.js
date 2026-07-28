import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/seller/profile — the logged-in seller's own shop profile
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler')) {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
    if (!profile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    return NextResponse.json({ profile: JSON.parse(JSON.stringify(profile)) })
  } catch (error) {
    console.error('GET /api/seller/profile error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH /api/seller/profile — currently just the open/closed toggle.
// Closing a shop hides its products from checkout without deleting anything.
// Body: { isOpen: boolean }
export async function PATCH(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler')) {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }
  try {
    const body = await request.json()
    if (typeof body.isOpen !== 'boolean') {
      return NextResponse.json({ error: 'isOpen must be a boolean' }, { status: 400 })
    }
    const profile = await prisma.sellerProfile.update({
      where: { userId: auth.userId },
      data:  { isOpen: body.isOpen },
    })
    return NextResponse.json({ profile: JSON.parse(JSON.stringify(profile)) })
  } catch (error) {
    console.error('PATCH /api/seller/profile error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
