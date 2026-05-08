export const dynamic = 'force-dynamic'

import { prisma } from '../../../../lib/prisma'

const BOT_RE = /bot|crawler|spider|slurp|bingbot|googlebot|facebookexternalhit|ia_archiver/i

async function getCountry(ip) {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.countryCode ?? null
  } catch {
    return null
  }
}

export async function POST(request) {
  const ua = request.headers.get('user-agent') ?? ''

  if (!BOT_RE.test(ua)) {
    const raw = request.headers.get('x-forwarded-for') ?? ''
    const ip  = raw.split(',')[0].trim() || null
    let body  = {}
    try { body = await request.json() } catch { /* ignore */ }

    getCountry(ip).then(country =>
      prisma.globalEvent.create({
        data: {
          ip,
          userAgent: ua || null,
          referrer:  body.referrer ?? null,
          country,
          page:      body.page ?? null,
        },
      })
    ).catch(() => {})
  }

  return new Response(null, { status: 204 })
}
