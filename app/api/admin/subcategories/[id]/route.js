import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

// PATCH /api/admin/subcategories/[id]
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId)
    const { name } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const subCategory = await prisma.subCategory.update({
      where: { id },
      data: { name: name.trim() },
    })
    return NextResponse.json({ subCategory })
  } catch (error) {
    console.error('PATCH /api/admin/subcategories/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/admin/subcategories/[id]
export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId)
    const count = await prisma.product.count({ where: { subCategoryId: id } })
    if (count > 0) {
      return NextResponse.json({ error: `Cannot delete — ${count} product(s) use this subcategory` }, { status: 409 })
    }
    await prisma.subCategory.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/admin/subcategories/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
