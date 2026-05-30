import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'

// GET /api/admin/sku-catalogue — admin only
// Returns all rows from Vape, Sparepart, Dokha, Cigarette tables
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [vapes, spareparts, dokhas, cigarettes] = await Promise.all([
      prisma.vape.findMany({ orderBy: [{ brand: 'asc' }, { product: 'asc' }] }),
      prisma.sparepart.findMany({ orderBy: [{ brand: 'asc' }, { sparepart: 'asc' }] }),
      prisma.dokha.findMany({ orderBy: { variant: 'asc' } }),
      prisma.cigarette.findMany({ orderBy: { name: 'asc' } }),
    ])

    return NextResponse.json({
      vapes:       JSON.parse(JSON.stringify(vapes)),
      spareparts:  JSON.parse(JSON.stringify(spareparts)),
      dokhas:      JSON.parse(JSON.stringify(dokhas)),
      cigarettes:  JSON.parse(JSON.stringify(cigarettes)),
    })
  } catch (error) {
    console.error('GET /api/admin/sku-catalogue error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
