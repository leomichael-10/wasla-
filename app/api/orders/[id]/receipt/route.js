import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'
import { uploadImage } from '../../../../../lib/cloudinary'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

// POST /api/orders/:id/receipt
// Customer only, own order. Uploads an InstaPay/Vodafone Cash transfer
// receipt for a manual_transfer order and puts it in PAYMENT_PENDING for
// an admin to confirm.
export async function POST(request, { params }) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: rawId } = await params
  const orderId = parseInt(rawId, 10)
  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.customerId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (order.paymentMethod !== 'manual_transfer') {
      return NextResponse.json({ error: 'This order is not paid by manual transfer' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('receipt')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No receipt image provided' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 })
    }

    const { secure_url } = await uploadImage(buffer, file.name ?? 'receipt')

    const updated = await prisma.order.update({
      where: { id: orderId },
      data:  { receiptUrl: secure_url, paymentStatus: 'PAYMENT_PENDING' },
    })

    return NextResponse.json({ order: JSON.parse(JSON.stringify(updated)) })
  } catch (error) {
    console.error('POST /api/orders/[id]/receipt error:', error)
    const msg = error?.message ?? String(error)
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 })
  }
}
