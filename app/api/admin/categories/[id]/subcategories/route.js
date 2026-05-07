import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { getUser } from '../../../../../../lib/auth'

// POST /api/admin/categories/[id]/subcategories
export async function POST(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id } = await params
    const categoryId = parseInt(id)
    const { name } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Subcategory name is required' }, { status: 400 })
    }
    const subCategory = await prisma.subCategory.create({
      data: { name: name.trim(), category: { connect: { id: categoryId } } },
    })
    return NextResponse.json({ subCategory }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/categories/[id]/subcategories error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
