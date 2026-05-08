import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt((await params).id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const req = await prisma.productRequest.update({
    where: { id },
    data:  { status: 'REVIEWED' },
  })
  return NextResponse.json({ request: JSON.parse(JSON.stringify(req)) })
}
