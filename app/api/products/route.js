import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { sanitizeString } from '../../../lib/sanitize'
import { getInternalFoodCategoryId } from '../../../lib/internalCategory'

const PRODUCT_SELECT = {
  variants: {
    select: { id: true, label: true, price: true, stockQty: true, image: true },
    orderBy: { price: 'asc' },
  },
  seller:   { select: { id: true, businessName: true, city: true, area: true, isOpen: true, deliveryAvailable: true } },
  category: { select: { id: true, name: true, icon: true } },
}

// GET /api/products — public listing.
// Reads Product + ProductVariant directly — the same model
// GET/PATCH/DELETE /api/products/[id] and the homepage rails already use.
// (Previously read from a separate MasterProduct/RetailerProduct catalog
// that sellers could never actually populate via a working create flow;
// see PROGRESS.md.)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search   = searchParams.get('search')
  const brand    = searchParams.get('brand')
  const city     = searchParams.get('city')
  const sort     = searchParams.get('sort') ?? 'az'
  const zoneId   = parseInt(searchParams.get('zoneId'), 10) || null

  // Restaurant dishes live only in the Restaurants section + their own
  // pages (see /api/restaurants), never in the shop/category product browse.
  const where = { isActive: true, seller: { isOpen: true, sellerType: 'SHOP' } }
  if (category) where.category = { name: { contains: category, mode: 'insensitive' } }
  if (brand)     where.brand = { contains: brand, mode: 'insensitive' }
  if (city)      where.seller = { ...where.seller, city: { contains: city, mode: 'insensitive' } }
  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const raw = await prisma.product.findMany({
      where,
      include: PRODUCT_SELECT,
    })

    // If the visitor has a selected delivery zone, annotate each product
    // with whether its shop actually covers that zone — the listing shows
    // it either way (grey, not hide, so a relevant search result doesn't
    // just vanish).
    let coverageMap = {}
    if (zoneId) {
      const sellerIds = [...new Set(raw.map(p => p.sellerId))]
      const coverage = await prisma.shopZoneCoverage.findMany({
        where: { zoneId, sellerId: { in: sellerIds }, isActive: true },
      })
      coverageMap = Object.fromEntries(coverage.map(c => [c.sellerId, true]))
    }

    let products = raw
      .filter(p => p.variants.length > 0)
      .map(p => ({
        ...p,
        variants: p.variants.map(v => ({ ...v, inStock: v.stockQty > 0 })),
        seller:   { ...p.seller, deliversToZone: zoneId ? Boolean(coverageMap[p.sellerId]) : undefined },
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
    const { name, categoryId, subCategoryId, brand, description, images, price, menuSection } = body

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
