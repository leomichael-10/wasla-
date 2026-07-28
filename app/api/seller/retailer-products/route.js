import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const items = await prisma.retailerProduct.findMany({
    where:   { retailerId: seller.id },
    orderBy: { createdAt: 'desc' },
    include: {
      masterProduct: {
        select: { id: true, name: true, images: true, category: { select: { id: true, name: true } } },
      },
    },
  })
  return NextResponse.json({ items: JSON.parse(JSON.stringify(items)) })
}

export async function POST(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  if (!seller.approvedByAdmin)
    return NextResponse.json({ error: 'Your account is pending admin approval' }, { status: 403 })

  const { masterProductId, price, stockQty } = await request.json()
  if (!masterProductId || price == null)
    return NextResponse.json({ error: 'masterProductId and price are required' }, { status: 400 })

  const master = await prisma.masterProduct.findFirst({
    where: { id: parseInt(masterProductId, 10), isActive: true },
  })
  if (!master) return NextResponse.json({ error: 'Product not found in catalog' }, { status: 404 })

  try {
    const item = await prisma.retailerProduct.create({
      data: {
        retailerId:      seller.id,
        masterProductId: master.id,
        price:        parseFloat(price),
        stockQty:        parseInt(stockQty, 10) || 0,
        status:          'PENDING',
      },
    })
    return NextResponse.json({ item: JSON.parse(JSON.stringify(item)) }, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002')
      return NextResponse.json({ error: 'You already selected this product' }, { status: 409 })
    throw e
  }
}
