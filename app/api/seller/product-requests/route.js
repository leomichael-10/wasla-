import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function POST(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const { name, notes } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Product name is required' }, { status: 400 })

  const req = await prisma.productRequest.create({
    data: { retailerId: seller.id, name: name.trim(), notes: notes?.trim() ?? null },
  })
  return NextResponse.json({ request: JSON.parse(JSON.stringify(req)) }, { status: 201 })
}
