import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt((await params).id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await request.json()
  const data = {}
  if (body.name        !== undefined) data.name        = body.name
  if (body.description !== undefined) data.description = body.description ?? null
  if (body.images      !== undefined) data.images      = Array.isArray(body.images) ? body.images : []
  if (body.categoryId  !== undefined) data.categoryId  = parseInt(body.categoryId, 10)
  if (body.specs       !== undefined) data.specs       = body.specs ?? null
  if (body.priceMin    !== undefined) data.priceMin    = body.priceMin != null ? parseFloat(body.priceMin) : null
  if (body.priceMax    !== undefined) data.priceMax    = body.priceMax != null ? parseFloat(body.priceMax) : null
  if (body.isActive    !== undefined) data.isActive    = Boolean(body.isActive)

  const product = await prisma.masterProduct.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ product: JSON.parse(JSON.stringify(product)) })
}

export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt((await params).id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  await prisma.masterProduct.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
