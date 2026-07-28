import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { getUser } from '../../../../../../lib/auth'

// PATCH /api/admin/orders/:id/payment
// Admin only. Confirms (or rejects) a manual-transfer receipt after
// reviewing it, moving the order out of PAYMENT_PENDING.
// Body: { action: 'confirm' | 'reject' }
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: rawId } = await params
  const orderId = parseInt(rawId, 10)
  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { action } = body
    if (!['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: "action must be 'confirm' or 'reject'" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.paymentStatus !== 'PAYMENT_PENDING') {
      return NextResponse.json({ error: 'Order is not awaiting payment confirmation' }, { status: 409 })
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data:  { paymentStatus: action === 'confirm' ? 'paid' : 'unpaid' },
    })

    return NextResponse.json({ order: JSON.parse(JSON.stringify(updated)) })
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id]/payment error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
