import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

// DELETE /api/seller/products/:id
// Seller only. Soft-deletes the product (sets isActive: false) so that
// existing order history referencing its variants is preserved.
export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: rawId } = await params
  const productId = parseInt(rawId, 10)
  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: auth.userId },
    })
    if (!sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    // Confirm the product belongs to this seller
    const product = await prisma.product.findFirst({
      where: { id: productId, sellerId: sellerProfile.id },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.update({
      where: { id: productId },
      data:  { isActive: false },
    })

    return NextResponse.json({ message: 'Product deactivated' })
  } catch (error) {
    console.error('DELETE /api/seller/products/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
