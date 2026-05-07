import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

// PATCH /api/admin/categories/[id]
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId)
    const { name, icon } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }
    const category = await prisma.category.update({
      where: { id },
      data: { name: name.trim(), icon: icon?.trim() || null },
      include: { subCategories: true, _count: { select: { products: true } } },
    })
    return NextResponse.json({ category })
  } catch (error) {
    console.error('PATCH /api/admin/categories/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId)
    const count = await prisma.product.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json({ error: `Cannot delete — ${count} product(s) use this category` }, { status: 409 })
    }
    await prisma.subCategory.deleteMany({ where: { categoryId: id } })
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/admin/categories/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
