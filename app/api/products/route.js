import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { sanitizeString } from '../../../lib/sanitize'
import { getInternalFoodCategoryId } from '../../../lib/internalCategory'
import { CATALOGUE_WHERE, CATALOGUE_INCLUDE, toCatalogueProducts } from '../../../lib/catalogue'

// GET /api/products — public listing (browse + search). Reads the same
// catalogue definition as /api/shops/[id] and the homepage (lib/catalogue.js).
//
// Zone is a real filter, not a sort key: when the visitor has a selected
// delivery zone, only products from sellers who actually cover it are
// returned at all — not shown-but-greyed, not sorted-to-the-bottom. With
// no zone set, every visitor-facing page already offers the global
// ZoneGate picker before this is ever called; ZoneGate is explicitly
// skippable, and a visitor who skipped it has already said "not now" —
// a second, page-level prompt here would be redundant, so the catalogue
// shows unfiltered rather than forcing the choice again.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search   = searchParams.get('search')
  const brand    = searchParams.get('brand')
  const sort     = searchParams.get('sort') ?? 'az'
  const zoneId   = parseInt(searchParams.get('zoneId'), 10) || null

  const where = { ...CATALOGUE_WHERE }
  if (category) where.category = { name: { contains: category, mode: 'insensitive' } }
  if (brand)     where.brand = { contains: brand, mode: 'insensitive' }
  if (zoneId)    where.seller = { ...CATALOGUE_WHERE.seller, zoneCoverage: { some: { zoneId, isActive: true } } }
  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { nameEn:      { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const raw = await prisma.product.findMany({
      where,
      include: CATALOGUE_INCLUDE,
    })

    // The where-clause above already guarantees every returned seller
    // covers the zone when one is set — no second query needed to find
    // out what the query itself just enforced.
    let products = toCatalogueProducts(raw).map(p => ({
      ...p,
      seller: { ...p.seller, deliversToZone: zoneId ? true : undefined },
    }))

    if (sort === 'az') products.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'za') products.sort((a, b) => b.name.localeCompare(a.name))
    else if (sort === 'price_asc') products.sort((a, b) => Number(a.variants[0].price) - Number(b.variants[0].price))
    else if (sort === 'price_desc') products.sort((a, b) => Number(b.variants[0].price) - Number(a.variants[0].price))

    return NextResponse.json({ products: JSON.parse(JSON.stringify(products)) })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Not exposed to the seller — products are assumed available until a
// seller explicitly marks otherwise via the edit page's per-variant stock.
// High enough that "in stock" holds without the seller managing a quantity.
const DEFAULT_STOCK_QTY = 999

// POST /api/products — seller only. Simplified single-price creation:
// name, category, price (all required), brand/subCategory/description/
// images optional. No variant/SKU/stock UI — internally this still
// creates exactly one ProductVariant to carry the price, since cart/
// checkout/order code addresses products by productVariantId throughout
// the app; that variant is never shown to the seller as a concept.
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Only sellers can create products' }, { status: 403 })
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
    if (!sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, nameEn, categoryId, subCategoryId, brand, description, images, price, menuSection } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 })
    }
    const numericPrice = parseFloat(price)
    if (!price || isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json({ error: 'A valid price is required.' }, { status: 400 })
    }
    // Restaurant menus are grouped by section on the customer-facing page
    // (see /api/restaurants/[id]) — a dish without one has nowhere to render.
    if (sellerProfile.sellerType === 'RESTAURANT' && !menuSection?.trim()) {
      return NextResponse.json({ error: 'Menu section is required.' }, { status: 400 })
    }

    // Restaurant dishes are ALWAYS auto-filed into the single internal
    // "Food" category server-side — the client can't choose a category
    // for a dish at all (see app/dashboard/products/add/page.js), and
    // even if something in the request body claimed a categoryId, it's
    // ignored here rather than trusted.
    let categoryRecordId
    if (sellerProfile.sellerType === 'RESTAURANT') {
      categoryRecordId = await getInternalFoodCategoryId()
    } else {
      if (!categoryId) {
        return NextResponse.json({ error: 'Category is required.' }, { status: 400 })
      }
      const category = await prisma.category.findUnique({ where: { id: parseInt(categoryId, 10) } })
      if (!category || category.isInternal) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      categoryRecordId = category.id
    }

    const product = await prisma.product.create({
      data: {
        sellerId:      sellerProfile.id,
        categoryId:    categoryRecordId,
        subCategoryId: sellerProfile.sellerType === 'RESTAURANT'
          ? null
          : (subCategoryId ? parseInt(subCategoryId, 10) : null),
        name:          sanitizeString(name, 200),
        nameEn:        nameEn?.trim()      ? sanitizeString(nameEn, 200)      : null,
        brand:         brand?.trim()       ? sanitizeString(brand, 100)       : null,
        description:   description?.trim() ? sanitizeString(description, 2000) : null,
        images:        Array.isArray(images) ? images.slice(0, 5) : [],
        menuSection:   sellerProfile.sellerType === 'RESTAURANT' && menuSection?.trim() ? sanitizeString(menuSection, 100) : null,
        isActive:      true,
        variants: {
          create: [{
            label:    null,
            price:    numericPrice,
            stockQty: DEFAULT_STOCK_QTY,
          }],
        },
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
      },
    })

    return NextResponse.json({ product: JSON.parse(JSON.stringify(product)) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
