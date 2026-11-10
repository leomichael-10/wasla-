import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { CATALOGUE_WHERE } from '../../../../lib/catalogue'

// GET /api/products/brands
// Public. Distinct, non-empty brand values across the real catalogue — the
// Browse filter's brand list must come from this, not a hardcoded guess,
// since sellers set `brand` as free text (e.g. "Bayt Al Sudan").
export async function GET() {
  try {
    const rows = await prisma.product.findMany({
      where:    { ...CATALOGUE_WHERE, brand: { not: null } },
      select:   { brand: true },
      distinct: ['brand'],
      orderBy:  { brand: 'asc' },
    })
    const brands = rows.map(r => r.brand).filter(Boolean)
    return NextResponse.json({ brands })
  } catch (error) {
    console.error('GET /api/products/brands error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
