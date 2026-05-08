export const dynamic = 'force-dynamic'

import { prisma } from '../../../../../lib/prisma'

const GIF    = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
const BOT_RE = /bot|crawler|spider|slurp|bingbot|googlebot|facebookexternalhit|ia_archiver/i

const GIF_RESPONSE = () =>
  new Response(GIF, {
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    },
  })

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

export async function GET(request, { params }) {
  const { pixelId } = await params
  const ua = request.headers.get('user-agent') ?? ''

  if (!BOT_RE.test(ua)) {
    const raw = request.headers.get('x-forwarded-for') ?? ''
    const ip  = raw.split(',')[0].trim() || null

    getCountry(ip).then(country =>
      prisma.trackingPixel.findUnique({ where: { id: pixelId } })
        .then(pixel => {
          if (!pixel) return
          return prisma.pixelEvent.create({
            data: {
              pixelId,
              sellerId:  pixel.sellerId,
              ip,
              userAgent: ua || null,
              referrer:  request.headers.get('referer') ?? null,
              country,
            },
          })
        })
    ).catch(() => {})
  }

  return GIF_RESPONSE()
}
