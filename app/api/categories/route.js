import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/categories
// Public. Returns all CUSTOMER-FACING categories with their subcategories —
// internal-only categories (e.g. the "Food" bucket restaurant dishes are
// auto-filed under, see /api/products) are never included here. Sellers
// never choose an internal category; the server assigns it.
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isInternal: false },
      include: {
        subCategories: {
          select:  { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('GET /api/categories error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
