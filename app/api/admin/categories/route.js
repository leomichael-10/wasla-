import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/admin/categories
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        subCategories: { orderBy: { name: 'asc' } },
        _count: { select: { products: true } },
      },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('GET /api/admin/categories error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/admin/categories
export async function POST(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { name, icon } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }
    const category = await prisma.category.create({
      data: { name: name.trim(), icon: icon?.trim() || null },
      include: { subCategories: true, _count: { select: { products: true } } },
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/categories error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
