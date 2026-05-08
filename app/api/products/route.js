import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'

// GET /api/products — public listing from RetailerProduct + MasterProduct
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search   = searchParams.get('search')
  const sort     = searchParams.get('sort') ?? 'az'

  const masterWhere = { isActive: true }
  if (category) masterWhere.category = { name: { contains: category, mode: 'insensitive' } }
  if (search) {
    masterWhere.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const retailerProducts = await prisma.retailerProduct.findMany({
      where: {
        status:  'APPROVED',
        retailer: { subscriptionStatus: 'ACTIVE', approvedByAdmin: true },
        masterProduct: masterWhere,
      },
      include: {
        masterProduct: {
          include: { category: { select: { id: true, name: true } } },
        },
        retailer: {
          select: { id: true, businessName: true, city: true, area: true, deliveryAvailable: true },
        },
      },
    })

    let products = retailerProducts.map(rp => ({
      id:          rp.id,
      name:        rp.masterProduct.name,
      description: rp.masterProduct.description,
      images:      rp.masterProduct.images,
      category:    rp.masterProduct.category,
      seller:      rp.retailer,
      variants: [{
        id:       rp.id,
        priceAed: rp.priceAed,
        flavor:   null,
        inStock:  rp.stockQty > 0,
      }],
      _retailerProductId: rp.id,
    }))

    if (sort === 'az') products.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'za') products.sort((a, b) => b.name.localeCompare(a.name))
    else if (sort === 'price_asc') products.sort((a, b) => Number(a.variants[0].priceAed) - Number(b.variants[0].priceAed))
    else if (sort === 'price_desc') products.sort((a, b) => Number(b.variants[0].priceAed) - Number(a.variants[0].priceAed))

    return NextResponse.json({ products: JSON.parse(JSON.stringify(products)) })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST removed — retailers select from catalog instead of creating products
export async function POST(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(
    { error: 'Direct product creation is disabled. Use the catalog selection flow.' },
    { status: 410 }
  )
}
