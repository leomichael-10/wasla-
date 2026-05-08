import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
  if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

  const [masterProducts, mySelections] = await Promise.all([
    prisma.masterProduct.findMany({
      where:   { isActive: true },
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.retailerProduct.findMany({
      where:  { retailerId: seller.id },
      select: { masterProductId: true, status: true },
    }),
  ])

  const selectionMap = Object.fromEntries(mySelections.map(s => [s.masterProductId, s.status]))

  const catalog = masterProducts.map(p => ({
    ...p,
    myStatus: selectionMap[p.id] ?? null,
  }))

  return NextResponse.json({ catalog: JSON.parse(JSON.stringify(catalog)) })
}
