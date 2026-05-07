import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'

// GET /api/products
// Public. Query params: ?city=&category=&brand=&search=&sort=az|za|popular|price_asc|price_desc
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const city     = searchParams.get('city')
  const category = searchParams.get('category')
  const brand    = searchParams.get('brand')
  const search   = searchParams.get('search')
  const sort     = searchParams.get('sort') ?? 'az'

  const where = { isActive: true }

  if (city) {
    where.seller = { city: { equals: city, mode: 'insensitive' } }
  }

  if (brand) {
    where.brand = { contains: brand, mode: 'insensitive' }
  }

  if (category) {
    where.category = { name: { contains: category, mode: 'insensitive' } }
  }

  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { brand:       { contains: search, mode: 'insensitive' } },
      { variants: { some: { flavor: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  // Determine DB-level orderBy (only for name sorts)
  const dbOrderBy = sort === 'za' ? { name: 'desc' } : { name: 'asc' }

  const VARIANT_SELECT = {
    select: {
      id:            true,
      flavor:        true,
      nicotineLevel: true,
      sizeMl:        true,
      puffCount:     true,
      resistanceOhm: true,
      priceAed:      true,
      stockQty:      true, // fetched internally, stripped from response below
      skuCode:       true,
      image:         true,
    },
    orderBy: { flavor: 'asc' },
  }

  try {
    let products = await prisma.product.findMany({
      where,
      include: {
        category:    { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        variants:    VARIANT_SELECT,
        seller: {
          select: {
            id:                true,
            businessName:      true,
            city:              true,
            area:              true,
            deliveryAvailable: true,
          },
        },
      },
      orderBy: dbOrderBy,
    })

    // JS-level sorts for price and popularity
    if (sort === 'price_asc') {
      products.sort((a, b) => {
        const minA = a.variants.length ? Math.min(...a.variants.map(v => Number(v.priceAed))) : Infinity
        const minB = b.variants.length ? Math.min(...b.variants.map(v => Number(v.priceAed))) : Infinity
        return minA - minB
      })
    } else if (sort === 'price_desc') {
      products.sort((a, b) => {
        const maxA = a.variants.length ? Math.max(...a.variants.map(v => Number(v.priceAed))) : 0
        const maxB = b.variants.length ? Math.max(...b.variants.map(v => Number(v.priceAed))) : 0
        return maxB - maxA
      })
    } else if (sort === 'popular') {
      const orderItemData = await prisma.orderItem.groupBy({
        by:   ['productVariantId'],
        _sum: { quantity: true },
      })
      const variantCountMap = Object.fromEntries(
        orderItemData.map(r => [r.productVariantId, r._sum.quantity ?? 0])
      )
      products.sort((a, b) => {
        const countA = a.variants.reduce((s, v) => s + (variantCountMap[v.id] ?? 0), 0)
        const countB = b.variants.reduce((s, v) => s + (variantCountMap[v.id] ?? 0), 0)
        return countB - countA
      })
    }

    const sanitized = products.map(p => ({
      ...p,
      variants: p.variants.map(({ stockQty, ...v }) => ({ ...v, inStock: stockQty > 0 })),
    }))

    return NextResponse.json({ products: JSON.parse(JSON.stringify(sanitized)) })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/products
// Seller only. Creates a product with one or more variants.
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: auth.userId },
    })

    if (!sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }
    if (!sellerProfile.approvedByAdmin) {
      return NextResponse.json(
        { error: 'Your account is pending admin approval' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { categoryId, subCategoryId, brand, name, description, variants } = body

    if (!categoryId || !name) {
      return NextResponse.json(
        { error: 'categoryId and name are required' },
        { status: 400 }
      )
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { error: 'At least one variant is required' },
        { status: 400 }
      )
    }

    // Validate each variant has a price
    for (const v of variants) {
      if (v.priceAed == null) {
        return NextResponse.json(
          { error: 'Each variant must have a priceAed' },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.create({
      data: {
        sellerId:     sellerProfile.id,
        categoryId,
        subCategoryId: subCategoryId ?? null,
        brand:        brand ?? null,
        name,
        description:  description ?? null,
        variants: {
          create: variants.map(v => ({
            flavor:        v.flavor        ?? null,
            nicotineLevel: v.nicotineLevel ?? null,
            sizeMl:        v.sizeMl        ?? null,
            puffCount:     v.puffCount     ?? null,
            resistanceOhm: v.resistanceOhm ?? null,
            priceAed:      v.priceAed,
            stockQty:      v.stockQty      ?? 0,
            skuCode:       v.skuCode       ?? null,
          })),
        },
      },
      include: {
        variants:    true,
        category:    { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
