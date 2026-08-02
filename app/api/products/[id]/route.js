import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { invalidatePrefix } from '../../../../lib/cache'
import { sanitizeString } from '../../../../lib/sanitize'

// PATCH /api/products/:id — seller only, must own product
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
    if (!sellerProfile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (product.sellerId !== sellerProfile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, brand, description, categoryId, subCategoryId, images, variants, menuSection } = body

    const productData = {}
    if (name          !== undefined) productData.name          = sanitizeString(name, 200)
    if (brand         !== undefined) productData.brand         = sanitizeString(brand, 100)
    if (description   !== undefined) productData.description   = sanitizeString(description, 2000)
    if (categoryId    !== undefined) productData.categoryId    = parseInt(categoryId, 10)
    if (subCategoryId !== undefined) productData.subCategoryId = subCategoryId ? parseInt(subCategoryId, 10) : null
    if (images        !== undefined) productData.images        = Array.isArray(images) ? images : []
    if (menuSection   !== undefined && sellerProfile.sellerType === 'RESTAURANT') {
      productData.menuSection = menuSection?.trim() ? sanitizeString(menuSection, 100) : null
    }

    const variantOps = []
    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.id) {
          const vData = {}
          if (v.label         !== undefined) vData.label         = v.label || null
          if (v.price      !== undefined) vData.price      = parseFloat(v.price)
          if (v.stockQty      !== undefined) vData.stockQty      = parseInt(v.stockQty, 10) || 0
          if (v.image         !== undefined) vData.image         = v.image || null
          if (v.isActive === false)          vData.stockQty      = 0

          if (Object.keys(vData).length > 0) {
            variantOps.push(prisma.productVariant.update({ where: { id: v.id }, data: vData }))
          }
        } else {
          variantOps.push(
            prisma.productVariant.create({
              data: {
                productId:     id,
                label:         v.label         || null,
                price:      parseFloat(v.price),
                stockQty:      parseInt(v.stockQty, 10) || 0,
                skuCode:       v.skuCode       || null,
                image:         v.image         || null,
              },
            })
          )
        }
      }
    }

    await prisma.$transaction([
      ...(Object.keys(productData).length > 0
        ? [prisma.product.update({ where: { id }, data: productData })]
        : []),
      ...variantOps,
    ])

    const updated = await prisma.product.findUnique({
      where:   { id },
      include: {
        category:    true,
        subCategory: true,
        variants:    { orderBy: { label: 'asc' } },
      },
    })

    invalidatePrefix('products:')
    return NextResponse.json({ product: JSON.parse(JSON.stringify(updated)) })
  } catch (error) {
    console.error('PATCH /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/products/:id — soft delete
export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
    if (!sellerProfile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (product.sellerId !== sellerProfile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.product.update({ where: { id }, data: { isActive: false } })
    invalidatePrefix('products:')
    return NextResponse.json({ success: true, message: 'Product deactivated.' })
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET /api/products/:id
// Public. Returns a single active product with all variants and seller details.
export async function GET(request, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  try {
    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        category:    { select: { id: true, name: true, icon: true } },
        subCategory: { select: { id: true, name: true } },
        variants: {
          select: {
            id:            true,
            label:         true,
            price:      true,
            stockQty:      true,
            skuCode:       true,
            image:         true,
          },
        },
        seller: {
          select: {
            id:                   true,
            businessName:         true,
            city:                 true,
            area:                 true,
            latitude:             true,
            longitude:            true,
            workingDays:          true,
            workingHours:         true,
            deliveryAvailable:    true,
            warrantyAvailable:    true,
            warrantyDuration:     true,
            maintenanceAvailable: true,
            isOpen:               true,
          },
        },
        reviews: {
          select: {
            id:        true,
            rating:    true,
            comment:   true,
            createdAt: true,
            customer: {
              select: {
                customerProfile: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product: JSON.parse(JSON.stringify(product)) })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
