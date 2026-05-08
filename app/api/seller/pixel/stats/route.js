import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const sid = seller.id

  const [totalHits, ipGroups, refGroups, daily] = await Promise.all([
    prisma.pixelEvent.count({ where: { sellerId: sid } }),
    prisma.pixelEvent.groupBy({ by: ['ip'], where: { sellerId: sid } }),
    prisma.pixelEvent.groupBy({
      by:      ['referrer'],
      where:   { sellerId: sid, referrer: { not: null } },
      _count:  { referrer: true },
      orderBy: { _count: { referrer: 'desc' } },
      take:    5,
    }),
    prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "PixelEvent"
      WHERE "sellerId" = ${sid}
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `,
  ])

  return NextResponse.json({
    totalHits,
    uniqueIps:    ipGroups.length,
    topReferrers: refGroups.map(r => ({ referrer: r.referrer, count: r._count.referrer })),
    dailyHits:    daily.map(r => ({
      date:  new Date(r.day).toISOString().slice(0, 10),
      count: Number(r.count),
    })),
  })
}
