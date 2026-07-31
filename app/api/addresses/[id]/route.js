import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { sanitizeString } from '../../../../lib/sanitize'
import { toE164Egypt } from '../../../../lib/phone'

const ADDRESS_SELECT = {
  id: true, label: true, zoneId: true, area: true, street: true,
  building: true, floor: true, apartment: true, landmark: true,
  contactPhone: true, notes: true, isDefault: true, createdAt: true,
  zone: { select: { id: true, nameEn: true, nameAr: true } },
}

async function loadOwnedAddress(addressId, userId) {
  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.userId !== userId) return null
  return address
}

// PATCH /api/addresses/:id — update one of the caller's own addresses.
export async function PATCH(request, { params }) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { id: rawId } = await params
  const addressId = parseInt(rawId, 10)
  if (isNaN(addressId)) return NextResponse.json({ error: 'Invalid address id' }, { status: 400 })

  try {
    const existing = await loadOwnedAddress(addressId, auth.userId)
    if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    const body = await request.json()
    const {
      label, zoneId, area, street, building, floor, apartment,
      landmark, contactPhone, notes, isDefault,
    } = body

    const data = {}

    if (label !== undefined) data.label = label ? sanitizeString(label, 60) : null
    if (area !== undefined) data.area = area ? sanitizeString(area, 150) : null
    if (street !== undefined) data.street = street ? sanitizeString(street, 200) : null
    if (notes !== undefined) data.notes = notes ? sanitizeString(notes, 300) : null

    if (building !== undefined) {
      if (!building.trim()) return NextResponse.json({ error: 'building is required.' }, { status: 400 })
      data.building = sanitizeString(building, 100)
    }
    if (floor !== undefined) {
      if (!floor.trim()) return NextResponse.json({ error: 'floor is required.' }, { status: 400 })
      data.floor = sanitizeString(floor, 30)
    }
    if (apartment !== undefined) {
      if (!apartment.trim()) return NextResponse.json({ error: 'apartment is required.' }, { status: 400 })
      data.apartment = sanitizeString(apartment, 30)
    }
    if (landmark !== undefined) {
      if (!landmark.trim()) return NextResponse.json({ error: 'landmark is required.' }, { status: 400 })
      data.landmark = sanitizeString(landmark, 200)
    }
    if (contactPhone !== undefined) {
      const normalized = toE164Egypt(contactPhone)
      if (!normalized) return NextResponse.json({ error: 'Please enter a valid Egyptian mobile number for contactPhone.' }, { status: 400 })
      data.contactPhone = normalized
    }
    if (zoneId !== undefined) {
      const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId } })
      if (!zone || !zone.isActive) return NextResponse.json({ error: 'Please select a valid delivery zone.' }, { status: 400 })
      data.zoneId = zone.id
      data.governorate = zone.nameEn
    }

    const address = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.address.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } })
        data.isDefault = true
      }
      return tx.address.update({ where: { id: addressId }, data, select: ADDRESS_SELECT })
    })

    return NextResponse.json({ address: JSON.parse(JSON.stringify(address)) })
  } catch (error) {
    console.error('PATCH /api/addresses/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE /api/addresses/:id — remove one of the caller's own addresses.
// If it was the default and other addresses remain, promotes the most
// recently created remaining address to default so there's never a gap.
export async function DELETE(request, { params }) {
  const auth = getUser(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { id: rawId } = await params
  const addressId = parseInt(rawId, 10)
  if (isNaN(addressId)) return NextResponse.json({ error: 'Invalid address id' }, { status: 400 })

  try {
    const existing = await loadOwnedAddress(addressId, auth.userId)
    if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } })

      if (existing.isDefault) {
        const next = await tx.address.findFirst({
          where:   { userId: auth.userId },
          orderBy: { createdAt: 'desc' },
        })
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/addresses/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
