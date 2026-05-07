import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/categories
// Public. Returns all categories with their subcategories.
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
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
