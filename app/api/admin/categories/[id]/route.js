import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'
import { getDeletionPreview, deleteCategory, CategoryDeletionError } from '../../../../../lib/categoryDeletion'

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

// GET /api/admin/categories/[id] — what a delete would affect. Read-only; the
// delete dialog uses it so the counts it shows come from the server.
export async function GET(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  try {
    const preview = await getDeletionPreview(prisma, id)
    return NextResponse.json(preview)
  } catch (error) {
    if (error instanceof CategoryDeletionError) {
      return NextResponse.json({ error: error.code, ...error.extra }, { status: error.status })
    }
    console.error('GET /api/admin/categories/[id] error:', error)
    return NextResponse.json({ error: 'FAILED' }, { status: 500 })
  }
}

// DELETE /api/admin/categories/[id]
// Body (optional for an empty category): { action: 'move'|'delete',
// destinationId, confirmCount }. Everything runs in one transaction.
export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  let body = {}
  try { body = await request.json() } catch { body = {} }
  const toInt = v => (v === null || v === undefined || v === '' ? null : parseInt(v, 10))

  try {
    const result = await prisma.$transaction(tx => deleteCategory(tx, id, {
      action:        body.action ?? 'delete',
      destinationId: toInt(body.destinationId),
      confirmCount:  toInt(body.confirmCount),
    }))
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CategoryDeletionError) {
      return NextResponse.json({ error: error.code, ...error.extra }, { status: error.status })
    }
    // A product was added to the category between the check and the delete;
    // the foreign key refused the category delete, so nothing was changed.
    if (error?.code === 'P2003') {
      return NextResponse.json({ error: 'COUNT_MISMATCH' }, { status: 409 })
    }
    console.error('DELETE /api/admin/categories/[id] error:', error)
    return NextResponse.json({ error: 'FAILED' }, { status: 500 })
  }
}
