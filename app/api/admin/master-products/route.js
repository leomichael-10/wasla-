import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const products = await prisma.masterProduct.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ products: JSON.parse(JSON.stringify(products)) })
}

export async function POST(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, description, images, categoryId, specs, priceMin, priceMax } = body
  if (!name || !categoryId)
    return NextResponse.json({ error: 'name and categoryId are required' }, { status: 400 })

  const product = await prisma.masterProduct.create({
    data: {
      name,
      description: description ?? null,
      images:      Array.isArray(images) ? images : [],
      categoryId:  parseInt(categoryId, 10),
      specs:       specs ?? null,
      priceMin:    priceMin != null ? parseFloat(priceMin) : null,
      priceMax:    priceMax != null ? parseFloat(priceMax) : null,
    },
    include: { category: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ product: JSON.parse(JSON.stringify(product)) }, { status: 201 })
}
