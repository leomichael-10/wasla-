import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'

// PATCH /api/admin/users/:id — admin only
// Body: { isBanned: true | false }
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const body = await request.json()
    if (typeof body.isBanned !== 'boolean') {
      return NextResponse.json({ error: 'isBanned (boolean) is required' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data:  { isBanned: body.isBanned },
      select: {
        id: true, email: true, role: true,
        isBanned: true, createdAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }
}
