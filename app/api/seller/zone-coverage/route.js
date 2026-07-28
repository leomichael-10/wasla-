import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

async function getSellerProfile(auth) {
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler')) return null
  return prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
}

// GET /api/seller/zone-coverage — every active zone, annotated with this
// shop's coverage (if any), so the dashboard can render toggles for all of them.
export async function GET(request) {
  const auth = getUser(request)
  const seller = await getSellerProfile(auth)
  if (!seller) return NextResponse.json({ error: 'Sellers only' }, { status: 403 })

  try {
    const [zones, coverage] = await Promise.all([
      prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { nameEn: 'asc' } }),
      prisma.shopZoneCoverage.findMany({ where: { sellerId: seller.id } }),
    ])
    const coverageMap = Object.fromEntries(coverage.map(c => [c.zoneId, c]))
    const merged = zones.map(zone => ({
      zone,
      coverage: coverageMap[zone.id] ?? null,
    }))
    return NextResponse.json({ zones: JSON.parse(JSON.stringify(merged)) })
  } catch (error) {
    console.error('GET /api/seller/zone-coverage error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/seller/zone-coverage — upsert this shop's coverage for one zone.
// Body: { zoneId, isActive, feeOverride?, minOrderValue?, cutoffTime? }
export async function POST(request) {
  const auth = getUser(request)
  const seller = await getSellerProfile(auth)
  if (!seller) return NextResponse.json({ error: 'Sellers only' }, { status: 403 })

  try {
    const body = await request.json()
    const { zoneId, isActive, feeOverride, minOrderValue, cutoffTime } = body
    if (!zoneId) {
      return NextResponse.json({ error: 'zoneId is required' }, { status: 400 })
    }

    const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId } })
    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    const data = {
      isActive:      isActive ?? true,
      feeOverride:   feeOverride != null && feeOverride !== '' ? feeOverride : null,
      minOrderValue: minOrderValue ?? 0,
      cutoffTime:    cutoffTime || null,
    }

    const coverage = await prisma.shopZoneCoverage.upsert({
      where:  { sellerId_zoneId: { sellerId: seller.id, zoneId } },
      update: data,
      create: { sellerId: seller.id, zoneId, ...data },
    })

    return NextResponse.json({ coverage: JSON.parse(JSON.stringify(coverage)) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/seller/zone-coverage error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
