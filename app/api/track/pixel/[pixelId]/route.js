import { prisma } from '../../../../../lib/prisma'
import geoip from 'geoip-lite'

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

export async function GET(request, { params }) {
  const { pixelId } = await params
  const ua = request.headers.get('user-agent') ?? ''

  if (!BOT_RE.test(ua)) {
    const raw = request.headers.get('x-forwarded-for') ?? ''
    const ip  = raw.split(',')[0].trim() || null
    const geo = ip ? geoip.lookup(ip) : null

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
            country:   geo?.country ?? null,
          },
        })
      })
      .catch(() => {})
  }

  return GIF_RESPONSE()
}
