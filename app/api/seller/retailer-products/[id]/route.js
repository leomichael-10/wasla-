import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt((await params).id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const item = await prisma.retailerProduct.findFirst({ where: { id, retailerId: seller.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.retailerProduct.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
