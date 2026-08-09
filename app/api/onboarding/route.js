import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { authOptions } from '../../../lib/authOptions'

export async function POST(request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Role comes from the server-verified session (sourced from the DB via
  // the JWT), never from this request's body. This branch only ever
  // completes whichever role the account was already created with (see
  // lib/authOptions.js) — it can't be used to grant the retailer role to
  // a logged-in customer.
  const isSeller = session.user.role === 'retailer' || session.user.role === 'wholesaler'

  try {
    if (isSeller) {
      const { businessName, whatsappNumber, sellerType, phone, city } = body

      if (!businessName?.trim()) {
        return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
      }
      if (!whatsappNumber) {
        return NextResponse.json({ error: 'A WhatsApp number is required to receive orders.' }, { status: 400 })
      }

      await prisma.user.update({
        where: { email: session.user.email },
        data: {
          phone:       phone?.trim() || null,
          city:        city?.trim()  || null,
          isOnboarded: true,
        },
      })

      // Created (with placeholder businessName, no whatsappNumber) at
      // account-creation time in lib/authOptions.js's Google seller-intent
      // path — this is where those placeholders get replaced with what
      // the person actually enters, same required fields the
      // email/password seller signup collects.
      await prisma.sellerProfile.update({
        where: { userId: session.user.userId },
        data: {
          businessName: businessName.trim(),
          whatsappNumber,
          sellerType: sellerType === 'RESTAURANT' ? 'RESTAURANT' : 'SHOP',
        },
      })

      return NextResponse.json({ role: session.user.role })
    }

    const { fullName, phone, city } = body

    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }

    // Onboarding never grants the retailer role — shops are provisioned
    // separately (private retailer link, the signup chooser, or the
    // Google seller-intent path). Keeps this from being a self-service
    // role-escalation path for a logged-in customer.
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        phone:       phone?.trim()    || null,
        city:        city?.trim()     || null,
        isOnboarded: true,
      },
    })

    await prisma.customerProfile.updateMany({
      where: { user: { email: session.user.email } },
      data:  { fullName: fullName.trim() },
    })

    return NextResponse.json({ role: 'customer' })
  } catch (err) {
    console.error('[/api/onboarding]', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
