import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

export async function PATCH(request) {
  const auth = getUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.user.update({
      where: { id: auth.userId },
      data:  { ageVerified: true },
    })
    return NextResponse.json({ success: true, message: 'Age verification recorded.' })
  } catch {
    return NextResponse.json({ error: 'Failed to update age verification.' }, { status: 500 })
  }
}
