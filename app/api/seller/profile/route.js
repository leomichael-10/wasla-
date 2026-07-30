import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { isEgyptianPhone, normalizeDigits } from '../../../../lib/phone'

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

// PATCH /api/seller/profile — the open/closed toggle and/or the WhatsApp
// number orders get sent to. Closing a shop hides its products from
// checkout without deleting anything.
// Body: { isOpen?: boolean, whatsappNumber?: string }
export async function PATCH(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler')) {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const data = {}

    if (body.isOpen !== undefined) {
      if (typeof body.isOpen !== 'boolean') {
        return NextResponse.json({ error: 'isOpen must be a boolean' }, { status: 400 })
      }
      data.isOpen = body.isOpen
    }

    if (body.whatsappNumber !== undefined) {
      if (!isEgyptianPhone(body.whatsappNumber)) {
        return NextResponse.json({ error: 'A valid Egyptian WhatsApp number is required (e.g. 01012345678)' }, { status: 400 })
      }
      const normalized = normalizeDigits(body.whatsappNumber)
      const current = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId }, select: { whatsappNumber: true } })
      data.whatsappNumber = normalized
      // Changing the number invalidates any prior verification — must
      // re-verify via /api/seller/whatsapp/send-code + verify-code.
      if (current?.whatsappNumber !== normalized) data.whatsappVerified = false
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const profile = await prisma.sellerProfile.update({
      where: { userId: auth.userId },
      data,
    })
    return NextResponse.json({ profile: JSON.parse(JSON.stringify(profile)) })
  } catch (error) {
    console.error('PATCH /api/seller/profile error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
