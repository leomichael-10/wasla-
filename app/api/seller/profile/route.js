import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { toE164 } from '../../../../lib/phone'
import { sanitizeString } from '../../../../lib/sanitize'

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

// PATCH /api/seller/profile — the open/closed toggle, business type
// (shop vs restaurant), business name, bilingual description, logo, and/or
// the WhatsApp number orders get sent to. Closing a shop hides its
// products from checkout without deleting anything.
// Body: { isOpen?, sellerType?: 'SHOP' | 'RESTAURANT', whatsappNumber?,
//         businessName?, descriptionAr?, descriptionEn?, logoUrl? }
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

    if (body.sellerType !== undefined) {
      if (!['SHOP', 'RESTAURANT'].includes(body.sellerType)) {
        return NextResponse.json({ error: 'sellerType must be SHOP or RESTAURANT' }, { status: 400 })
      }
      data.sellerType = body.sellerType
    }

    if (body.whatsappNumber !== undefined) {
      const normalized = toE164(body.whatsappNumber)
      if (!normalized) {
        return NextResponse.json({ error: 'A valid WhatsApp number is required (e.g. 01012345678 or +249…)' }, { status: 400 })
      }
      const current = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId }, select: { whatsappNumber: true } })
      data.whatsappNumber = normalized
      // Changing the number invalidates any prior verification — must
      // re-verify via /api/seller/whatsapp/send-code + verify-code.
      if (current?.whatsappNumber !== normalized) data.whatsappVerified = false
    }

    if (body.businessName !== undefined) {
      const name = sanitizeString(body.businessName, 150)
      if (!name) return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
      data.businessName = name
    }

    // Arabic required (Wasla is Arabic-first), English optional — same
    // rule as the register form's business fields.
    if (body.descriptionAr !== undefined) {
      const desc = sanitizeString(body.descriptionAr, 500)
      if (!desc) return NextResponse.json({ error: 'Arabic description is required.' }, { status: 400 })
      data.descriptionAr = desc
    }
    if (body.descriptionEn !== undefined) {
      data.descriptionEn = body.descriptionEn ? sanitizeString(body.descriptionEn, 500) : null
    }

    if (body.logoUrl !== undefined) {
      // Only ever a Cloudinary URL from POST /api/upload (see
      // app/dashboard/settings/page.js) — never accepts an arbitrary
      // client-supplied URL for anything other than storage here; upload
      // itself is auth-gated (sellers/admin only) and validates
      // type/size server-side.
      if (typeof body.logoUrl !== 'string' || !body.logoUrl.startsWith('https://res.cloudinary.com/')) {
        return NextResponse.json({ error: 'logoUrl must be a Cloudinary URL.' }, { status: 400 })
      }
      data.logoUrl = body.logoUrl
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
