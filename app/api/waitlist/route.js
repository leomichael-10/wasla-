import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { sanitizeString } from '../../../lib/sanitize'

// POST /api/waitlist — public. Captures out-of-zone visitors instead of a dead end.
// Body: { district, phone? }
export async function POST(request) {
  try {
    const body = await request.json()
    const district = sanitizeString(body.district, 100)
    const phone    = body.phone ? sanitizeString(body.phone, 30) : null

    if (!district) {
      return NextResponse.json({ error: 'district is required' }, { status: 400 })
    }

    await prisma.deliveryWaitlist.create({ data: { district, phone } })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('POST /api/waitlist error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
