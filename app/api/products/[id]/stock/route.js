import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

// PATCH /api/products/:id/stock — seller only, must own product
// Body: { variants: [{ variantId, quantity, movementType }] }
// movementType: 'add' | 'remove' | 'set'
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  const { id: rawId } = await params
  const productId = parseInt(rawId, 10)
  if (isNaN(productId)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
    if (!sellerProfile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })

    const product = await prisma.product.findUnique({
      where:   { id: productId },
      include: { variants: true },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (product.sellerId !== sellerProfile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { variants } = body

    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ error: 'variants array is required' }, { status: 400 })
    }

    const ops = []

    for (const item of variants) {
      const { variantId, quantity, movementType } = item
      const qty = parseInt(quantity, 10)

      if (!variantId || isNaN(qty) || qty < 0) continue
      if (!['add', 'remove', 'set'].includes(movementType)) continue

      const variant = product.variants.find(v => v.id === parseInt(variantId, 10))
      if (!variant) continue

      let newStock
      if (movementType === 'add')    newStock = variant.stockQty + qty
      if (movementType === 'remove') newStock = Math.max(0, variant.stockQty - qty)
      if (movementType === 'set')    newStock = qty

      ops.push(
        prisma.productVariant.update({
          where: { id: parseInt(variantId, 10) },
          data:  { stockQty: newStock },
        })
      )

      ops.push(
        prisma.stockMovement.create({
          data: {
            sellerId:        sellerProfile.id,
            productVariantId: parseInt(variantId, 10),
            movementType,
            quantity:        qty,
            note:            item.note || null,
          },
        })
      )
    }

    await prisma.$transaction(ops)

    const updated = await prisma.product.findUnique({
      where:   { id: productId },
      include: { variants: { orderBy: { flavor: 'asc' } } },
    })

    return NextResponse.json({ product: JSON.parse(JSON.stringify(updated)) })
  } catch (error) {
    console.error('PATCH /api/products/[id]/stock error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
