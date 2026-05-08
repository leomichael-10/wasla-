import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt((await params).id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { action, adminNote } = await request.json()
  if (!['approve', 'reject'].includes(action))
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })

  const item = await prisma.retailerProduct.update({
    where: { id },
    data: {
      status:    action === 'approve' ? 'APPROVED' : 'REJECTED',
      adminNote: adminNote ?? null,
    },
  })
  return NextResponse.json({ item: JSON.parse(JSON.stringify(item)) })
}
