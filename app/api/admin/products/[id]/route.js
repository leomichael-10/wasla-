import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

// PATCH /api/admin/products/:id — toggle isActive
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const body = await request.json()
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive (boolean) is required' }, { status: 400 })
    }

    const product = await prisma.product.update({
      where:  { id },
      data:   { isActive: body.isActive },
      select: { id: true, name: true, isActive: true },
    })

    return NextResponse.json({ product: JSON.parse(JSON.stringify(product)) })
  } catch {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
  }
}
