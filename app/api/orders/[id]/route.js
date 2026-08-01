import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { sendWhatsApp } from '../../../../lib/whatsapp'
import { sendEmail } from '../../../../lib/email'
import { orderAccepted, orderDelivered } from '../../../../lib/emailTemplates'
import { deductCommission } from '../../../../lib/wallet'

// Valid status transitions a seller may make
const VALID_TRANSITIONS = {
  PLACED:           ['SHOP_CONFIRMED', 'CANCELLED'],
  SHOP_CONFIRMED:   ['PREPARING', 'CANCELLED'],
  PREPARING:        ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
}

// PATCH /api/orders/:id
// Seller only. Advances the order through its status lifecycle.
// Body: { status: 'SHOP_CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' }
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.role !== 'retailer' && auth.role !== 'wholesaler') {
    return NextResponse.json({ error: 'Only sellers can update order status' }, { status: 403 })
  }

  const { id: rawId } = await params
  const orderId = parseInt(rawId, 10)
  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 })
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: auth.userId },
    })
    if (!sellerProfile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { customer: { select: { email: true, whatsapp: true } } },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.sellerId !== sellerProfile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status: newStatus } = body

    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const allowed = VALID_TRANSITIONS[order.status]
    if (!allowed) {
      return NextResponse.json(
        { error: `Order is already in a terminal state: ${order.status}` },
        { status: 409 }
      )
    }
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${order.status}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`,
        },
        { status: 409 }
      )
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data:  { status: newStatus },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: { select: { id: true, name: true, brand: true } } },
            },
          },
        },
      },
    })

    // Send notifications based on new status (non-blocking)
    const customerEmail = order.customer?.email
    const customerWa    = order.customer?.whatsapp
      ? `whatsapp:${order.customer.whatsapp}`
      : null

    if (newStatus === 'SHOP_CONFIRMED') {
      if (customerEmail) {
        sendEmail(
          customerEmail,
          `Wasla — Order #${orderId} accepted`,
          orderAccepted(updated)
        )
      }
      if (customerWa) {
        sendWhatsApp(
          customerWa,
          `Your Wasla order #${orderId} has been accepted and is being prepared.`
        )
      }
    }

    if (newStatus === 'DELIVERED') {
      // Commission (5% of goods only — order.total already excludes
      // deliveryFee, which is stored separately) is deducted here, at
      // completion, never at placement. Idempotent on (orderId, shopId) —
      // safe if this status update is re-fired.
      try {
        await deductCommission({
          sellerId:      order.sellerId,
          orderId:       order.id,
          goodsSubtotal: order.total,
        })
      } catch (walletErr) {
        console.error('[PATCH /api/orders/[id]] commission deduction failed:', walletErr)
      }

      if (customerEmail) {
        sendEmail(
          customerEmail,
          `Wasla — Order #${orderId} delivered`,
          orderDelivered(updated)
        )
      }
      if (customerWa) {
        sendWhatsApp(
          customerWa,
          `Your Wasla order #${orderId} has been delivered. Thank you for shopping with Wasla!`
        )
      }
    }

    return NextResponse.json({ order: JSON.parse(JSON.stringify(updated)) })
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
