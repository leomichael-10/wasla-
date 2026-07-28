import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { resolvePromise, resolveFee } from '../../../../lib/delivery'

// GET /api/delivery/quote?zoneId=1&sellerIds=1,2,3
// Public. Returns per-shop delivery fee/ETA/min-order/coverage for a zone —
// used by the cart to split fee/ETA per shop and by product listings to grey
// out shops that don't cover the visitor's selected zone.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const zoneId    = parseInt(searchParams.get('zoneId'), 10)
    const sellerIds = (searchParams.get('sellerIds') ?? '')
      .split(',')
      .map(s => parseInt(s, 10))
      .filter(Boolean)

    if (!zoneId || sellerIds.length === 0) {
      return NextResponse.json({ error: 'zoneId and sellerIds are required' }, { status: 400 })
    }

    const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId } })
    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    const coverage = await prisma.shopZoneCoverage.findMany({
      where: { zoneId, sellerId: { in: sellerIds }, isActive: true },
    })
    const coverageMap = Object.fromEntries(coverage.map(c => [c.sellerId, c]))

    const quotes = sellerIds.map(sellerId => {
      const cov = coverageMap[sellerId]
      if (!cov) {
        return { sellerId, covered: false }
      }
      const fee = resolveFee(zone, cov)
      const { sameDay, promisedEta } = resolvePromise(cov.cutoffTime, zone.etaMinutes)
      return {
        sellerId,
        covered:       true,
        fee,
        minOrderValue: Number(cov.minOrderValue),
        cutoffTime:    cov.cutoffTime,
        sameDay,
        promisedEta,
      }
    })

    return NextResponse.json({ zone: JSON.parse(JSON.stringify(zone)), quotes: JSON.parse(JSON.stringify(quotes)) })
  } catch (error) {
    console.error('GET /api/delivery/quote error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
