import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { sendEmail } from '../../../../../lib/email'
import { subscriptionActivated } from '../../../../../lib/emailTemplates'
import { getUser } from '../../../../../lib/auth'

// PATCH /api/admin/subscriptions/:id
// action: 'activate' | 'reject'
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const body   = await request.json()
    const action = body.action // 'activate' | 'reject'

    let updateData

    if (action === 'activate') {
      const now     = new Date()
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + 30)

      updateData = {
        status:        'active',
        paymentStatus: 'paid',
        startDate:     now,
        endDate,
      }

      // Approve the seller at the same time
      const sub = await prisma.subscription.findUnique({ where: { id } })
      if (sub) {
        await prisma.sellerProfile.update({
          where: { id: sub.sellerId },
          data:  { approvedByAdmin: true },
        })
      }
    } else if (action === 'reject') {
      updateData = { status: 'rejected', paymentStatus: 'unpaid' }
    } else {
      return NextResponse.json({ error: 'Invalid action — use activate or reject' }, { status: 400 })
    }

    const subscription = await prisma.subscription.update({
      where:   { id },
      data:    updateData,
      include: { seller: { include: { user: { select: { email: true } } } } },
    })

    // Send activated email
    if (action === 'activate') {
      const sellerUser = subscription.seller?.user
      if (sellerUser?.email) {
        sendEmail(
          sellerUser.email,
          'Tobaki — Your subscription is now active!',
          subscriptionActivated(subscription.seller?.businessName ?? 'Seller')
        )
      }
    }

    return NextResponse.json({ subscription: JSON.parse(JSON.stringify(subscription)) })
  } catch {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
  }
}
