import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { sendWhatsApp } from '../../../lib/whatsapp'
import { sendEmail } from '../../../lib/email'
import { orderConfirmation, newOrderAlert } from '../../../lib/emailTemplates'
import { resolvePromise, resolveFee } from '../../../lib/delivery'
import { getPaymentProvider } from '../../../lib/payments'

const ORDER_INCLUDE = {
  items: {
    include: {
      productVariant: {
        include: {
          product: {
            select: { id: true, name: true, brand: true, images: true },
          },
        },
      },
    },
  },
  seller: { select: { id: true, businessName: true, city: true } },
}

// GET /api/orders
// Customer: returns their own orders.
// Seller:   returns orders placed at their shop.
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    let orders

    if (auth.role === 'customer') {
      orders = await prisma.order.findMany({
        where:   { customerId: auth.userId },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })
    } else if (auth.role === 'retailer' || auth.role === 'wholesaler') {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: auth.userId },
      })
      if (!sellerProfile) {
        return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
      }
      orders = await prisma.order.findMany({
        where:   { sellerId: sellerProfile.id },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ orders: JSON.parse(JSON.stringify(orders)) })
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/orders
// Customer only. Places a new order.
// Body: { sellerId, deliveryAddress, paymentMethod, items: [{ productVariantId, quantity }] }
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.role !== 'customer') {
    return NextResponse.json({ error: 'Only customers can place orders' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { sellerId, deliveryAddress, paymentMethod, items, zoneId, orderGroupId } = body

    if (!sellerId || !deliveryAddress || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'sellerId, deliveryAddress, and at least one item are required' },
        { status: 400 }
      )
    }

    for (const item of items) {
      if (!item.productVariantId || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: 'Each item requires productVariantId and a quantity >= 1' },
          { status: 400 }
        )
      }
    }

    const variantIds = items.map(i => i.productVariantId)

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { sellerId: true, isActive: true } } },
    })

    if (variants.length !== variantIds.length) {
      return NextResponse.json(
        { error: 'One or more product variants not found' },
        { status: 404 }
      )
    }

    for (const variant of variants) {
      if (variant.product.sellerId !== sellerId) {
        return NextResponse.json(
          { error: `Variant ${variant.id} does not belong to the specified seller` },
          { status: 400 }
        )
      }
      if (!variant.product.isActive) {
        return NextResponse.json(
          { error: `Variant ${variant.id} belongs to an inactive product` },
          { status: 400 }
        )
      }
    }

    const variantMap = Object.fromEntries(variants.map(v => [v.id, v]))

    for (const item of items) {
      const variant = variantMap[item.productVariantId]
      if (variant.stockQty < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for variant ${variant.id} — available: ${variant.stockQty}, requested: ${item.quantity}`,
          },
          { status: 409 }
        )
      }
    }

    const total      = items.reduce((sum, item) => {
      return sum + Number(variantMap[item.productVariantId].price) * item.quantity
    }, 0)

    const commissionRate = 0.10
    const commission  = parseFloat((total * commissionRate).toFixed(2))

    // Zone/delivery is optional (older clients or admin-created orders may omit it),
    // but if a zoneId is supplied we validate coverage and recompute the fee
    // server-side rather than trusting whatever the client sent.
    let resolvedZoneId    = null
    let resolvedFee       = 0
    let resolvedPromised  = null
    if (zoneId) {
      const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId } })
      const coverage = zone
        ? await prisma.shopZoneCoverage.findUnique({ where: { sellerId_zoneId: { sellerId, zoneId } } })
        : null
      if (!zone || !coverage || !coverage.isActive) {
        return NextResponse.json({ error: 'This shop does not deliver to your selected area' }, { status: 400 })
      }
      if (total < Number(coverage.minOrderValue)) {
        return NextResponse.json(
          { error: `Minimum order for this shop is EGP ${Number(coverage.minOrderValue).toFixed(0)}` },
          { status: 400 }
        )
      }
      resolvedZoneId   = zoneId
      resolvedFee      = resolveFee(zone, coverage)
      resolvedPromised = resolvePromise(coverage.cutoffTime, zone.etaMinutes).promisedEta
    }

    const provider = getPaymentProvider(paymentMethod ?? 'cod')
    let paymentInit
    try {
      paymentInit = await provider.initiate({ orderId: null, total })
    } catch (err) {
      if (err.code === 'PROVIDER_NOT_CONFIGURED') {
        return NextResponse.json({ error: err.message }, { status: 503 })
      }
      throw err
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId:     auth.userId,
          sellerId,
          status:         'PLACED',
          orderGroupId:   orderGroupId ?? null,
          total,
          commission,
          commissionRate,
          deliveryAddress,
          zoneId:         resolvedZoneId,
          deliveryFee:    resolvedFee,
          promisedEta:    resolvedPromised,
          paymentMethod:  provider.name,
          paymentStatus:  paymentInit.paymentStatus,
          items: {
            create: items.map(item => ({
              productVariantId: item.productVariantId,
              quantity:         item.quantity,
              priceAtPurchase:  variantMap[item.productVariantId].price,
            })),
          },
        },
        include: {
          ...ORDER_INCLUDE,
          customer: { select: { email: true, whatsapp: true } },
        },
      })

      await Promise.all(
        items.map(item =>
          tx.productVariant.update({
            where: { id: item.productVariantId },
            data:  { stockQty: { decrement: item.quantity } },
          })
        )
      )

      return created
    })

    // Fetch seller info for notifications
    const sellerFull = await prisma.sellerProfile.findUnique({
      where:   { id: sellerId },
      include: { user: { select: { email: true, whatsapp: true } } },
    })

    // Send notifications (non-blocking)
    const customerEmail = order.customer?.email
    const sellerEmail   = sellerFull?.user?.email
    const sellerWa      = sellerFull?.user?.whatsapp
      ? `whatsapp:${sellerFull.user.whatsapp}`
      : null

    if (customerEmail) {
      sendEmail(
        customerEmail,
        `Wasla — Order #${order.id} confirmed`,
        orderConfirmation(order, order.items)
      )
    }

    if (sellerEmail) {
      sendEmail(
        sellerEmail,
        `New order on Wasla — Order #${order.id}`,
        newOrderAlert(order, order.items)
      )
    }

    if (sellerWa) {
      sendWhatsApp(
        sellerWa,
        `New order on Wasla! Order #${order.id} — ${order.items.length} item${order.items.length !== 1 ? 's' : ''} — EGP ${total.toFixed(2)}. Login to your dashboard to accept.`
      )
    }

    // Return order without internal customer email
    const { customer: _c, ...orderPayload } = order
    return NextResponse.json({ order: JSON.parse(JSON.stringify(orderPayload)) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
