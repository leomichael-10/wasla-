import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [totalHits, ipGroups, pageGroups, countryGroups, daily] = await Promise.all([
    prisma.globalEvent.count(),
    prisma.globalEvent.groupBy({ by: ['ip'] }),
    prisma.globalEvent.groupBy({
      by:      ['page'],
      where:   { page: { not: null } },
      _count:  { page: true },
      orderBy: { _count: { page: 'desc' } },
      take:    10,
    }),
    prisma.globalEvent.groupBy({
      by:      ['country'],
      where:   { country: { not: null } },
      _count:  { country: true },
      orderBy: { _count: { country: 'desc' } },
      take:    10,
    }),
    prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "GlobalEvent"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `,
  ])

  return NextResponse.json({
    totalHits,
    uniqueIps:    ipGroups.length,
    topPages:     pageGroups.map(r => ({ page: r.page, count: r._count.page })),
    topCountries: countryGroups.map(r => ({ country: r.country, count: r._count.country })),
    dailyHits:    daily.map(r => ({
      date:  new Date(r.day).toISOString().slice(0, 10),
      count: Number(r.count),
    })),
  })
}
