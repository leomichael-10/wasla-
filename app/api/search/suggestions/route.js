import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sanitizeString } from '../../../../lib/sanitize'

const MAX_RESULTS = 5
const MIN_QUERY_LENGTH = 2

// GET /api/search/suggestions?q=... — lightweight autocomplete for the
// header search bar (components/SearchAutocomplete.js). Deliberately
// separate from GET /api/products: that route returns full product rows
// for the browse/filter page, this one returns just the handful of fields
// the dropdown renders, capped at MAX_RESULTS per group, from both
// Product (name/nameEn) and SellerProfile (businessName — shops and
// restaurants together, matching how the dropdown groups them).
//
// name/nameEn/businessName are indexed with pg_trgm GIN indexes (see
// prisma/migrations/20260823120000_search_suggestion_trgm_indexes) so the
// `contains`+`insensitive` (ILIKE '%term%') filters below stay fast as the
// catalog grows — a plain B-tree can't accelerate a leading-wildcard scan.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = sanitizeString(searchParams.get('q') ?? '', 100)

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ products: [], shops: [] })
  }

  try {
    const [rawProducts, rawShops] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          seller: { isOpen: true, sellerType: 'SHOP' },
          OR: [
            { name:   { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id:     true,
          name:   true,
          nameEn: true,
          images: true,
          variants: {
            select:  { price: true },
            orderBy: { price: 'asc' },
            take:    1,
          },
        },
        take: MAX_RESULTS,
      }),
      prisma.sellerProfile.findMany({
        where: {
          approvedByAdmin: true,
          businessName:    { contains: q, mode: 'insensitive' },
        },
        select: {
          id:           true,
          businessName: true,
          logoUrl:      true,
          sellerType:   true,
        },
        take: MAX_RESULTS,
      }),
    ])

    const products = rawProducts.map(p => ({
      id:     p.id,
      name:   p.name,
      nameEn: p.nameEn,
      image:  p.images?.[0] ?? null,
      price:  p.variants[0] ? Number(p.variants[0].price) : null,
    }))

    const shops = rawShops.map(s => ({
      id:      s.id,
      name:    s.businessName,
      logoUrl: s.logoUrl,
      type:    s.sellerType,
    }))

    return NextResponse.json({ products, shops })
  } catch (error) {
    console.error('GET /api/search/suggestions error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
