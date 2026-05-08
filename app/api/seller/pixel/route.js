import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const pixel = await prisma.trackingPixel.upsert({
    where:  { sellerId: seller.id },
    create: { sellerId: seller.id },
    update: {},
  })

  const base      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const embedCode = `<img src="${base}/api/track/pixel/${pixel.id}" width="1" height="1" style="display:none" alt="" />`

  return NextResponse.json({ pixelId: pixel.id, embedCode })
}
