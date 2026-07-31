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

  const { fullName, phone, city } = body

  if (!fullName?.trim()) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
  }

  try {
    // Onboarding never grants the retailer role — shops are provisioned
    // separately via the private retailer signup link. Keeps this from
    // being a self-service role-escalation path for a logged-in customer.
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
