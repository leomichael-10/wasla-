import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/auth'
import { sanitizeString } from '../../../lib/sanitize'
import { toE164Egypt } from '../../../lib/phone'

const ADDRESS_SELECT = {
  id: true, label: true, zoneId: true, area: true, street: true,
  building: true, floor: true, apartment: true, landmark: true,
  contactPhone: true, notes: true, isDefault: true, createdAt: true,
  zone: { select: { id: true, nameEn: true, nameAr: true } },
}

// GET /api/addresses — the caller's own saved addresses, default first.
export async function GET(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const addresses = await prisma.address.findMany({
      where:   { userId: auth.userId },
      select:  ADDRESS_SELECT,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ addresses: JSON.parse(JSON.stringify(addresses)) })
  } catch (error) {
    console.error('GET /api/addresses error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/addresses — create a saved address for the caller.
// Body: { label?, zoneId, area?, street?, building, floor, apartment,
//         landmark, contactPhone, notes?, isDefault? }
export async function POST(request) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      label, zoneId, area, street, building, floor, apartment,
      landmark, contactPhone, notes, isDefault,
    } = body

    if (!zoneId || !building?.trim() || !floor?.trim() || !apartment?.trim() || !landmark?.trim() || !contactPhone?.trim()) {
      return NextResponse.json(
        { error: 'zoneId, building, floor, apartment, landmark, and contactPhone are required.' },
        { status: 400 }
      )
    }

    const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId } })
    if (!zone || !zone.isActive) {
      return NextResponse.json({ error: 'Please select a valid delivery zone.' }, { status: 400 })
    }

    const normalizedPhone = toE164Egypt(contactPhone)
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Please enter a valid Egyptian mobile number for contactPhone.' }, { status: 400 })
    }

    const existingCount = await prisma.address.count({ where: { userId: auth.userId } })
    const makeDefault = isDefault === true || existingCount === 0

    const address = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } })
      }
      return tx.address.create({
        data: {
          userId:       auth.userId,
          label:        label ? sanitizeString(label, 60) : null,
          governorate:  zone.nameEn,
          zoneId:       zone.id,
          area:         area ? sanitizeString(area, 150) : null,
          street:       street ? sanitizeString(street, 200) : null,
          building:     sanitizeString(building, 100),
          floor:        sanitizeString(floor, 30),
          apartment:    sanitizeString(apartment, 30),
          landmark:     sanitizeString(landmark, 200),
          contactPhone: normalizedPhone,
          notes:        notes ? sanitizeString(notes, 300) : null,
          isDefault:    makeDefault,
        },
        select: ADDRESS_SELECT,
      })
    })

    return NextResponse.json({ address: JSON.parse(JSON.stringify(address)) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/addresses error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
