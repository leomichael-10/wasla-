import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/zones — public. Returns active delivery zones for the zone-gate picker.
export async function GET() {
  try {
    const zones = await prisma.deliveryZone.findMany({
      where:   { isActive: true },
      orderBy: { nameEn: 'asc' },
      select:  { id: true, nameEn: true, nameAr: true, districts: true, baseFee: true, etaMinutes: true },
    })
    return NextResponse.json({ zones: JSON.parse(JSON.stringify(zones)) })
  } catch (error) {
    console.error('GET /api/zones error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
