import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { getUser } from '../../../../../../lib/auth'

export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt((await params).id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { action } = await request.json()
  if (!['activate', 'suspend', 'reset'].includes(action))
    return NextResponse.json({ error: 'action must be activate, suspend, or reset' }, { status: 400 })

  const statusMap = { activate: 'ACTIVE', suspend: 'SUSPENDED', reset: 'PENDING' }

  const seller = await prisma.sellerProfile.update({
    where:  { id },
    data:   { subscriptionStatus: statusMap[action] },
    select: { id: true, subscriptionStatus: true },
  })
  return NextResponse.json({ seller })
}
