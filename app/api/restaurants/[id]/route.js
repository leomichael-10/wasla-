import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// GET /api/restaurants/[id] — a single restaurant + its menu (dishes).
// Dishes are ordinary Product rows owned by a RESTAURANT-type seller — same
// model shop products use (see app/api/products/route.js) — so add-to-cart
// and pricing work identically.
export async function GET(request, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 })

  try {
    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
          take:    20,
          include: { customer: { include: { customerProfile: { select: { fullName: true } } } } },
        },
        products: {
          where:   { isActive: true },
          // Ascending so the menu reads in the order the owner added
          // dishes — sections below are grouped in first-appearance order.
          orderBy: { createdAt: 'asc' },
          include: {
            variants: { select: { id: true, label: true, price: true, stockQty: true, image: true }, orderBy: { price: 'asc' } },
            category: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!seller || seller.sellerType !== 'RESTAURANT') {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const avg = seller.reviews.length
      ? seller.reviews.reduce((s, r) => s + r.rating, 0) / seller.reviews.length
      : 0

    const dishes = seller.products
      .filter(p => p.variants.length > 0)
      .map(p => ({
        ...p,
        variants: p.variants.map(v => ({ ...v, inStock: v.stockQty > 0 })),
        seller:   { id: seller.id, businessName: seller.businessName, city: seller.city, isOpen: seller.isOpen },
      }))

    // Group into menu sections in first-appearance order (dishes are
    // already ascending by createdAt). Section-less dishes (SHOP-created
    // data predating Phase 3b, or just never set) fall into a single
    // trailing "Other" bucket rather than disappearing.
    const sectionOrder = []
    const sectionMap = {}
    for (const dish of dishes) {
      const key = dish.menuSection?.trim() || null
      if (!(key in sectionMap)) { sectionMap[key] = []; sectionOrder.push(key) }
      sectionMap[key].push(dish)
    }
    const menuSections = sectionOrder.map(key => ({ section: key, dishes: sectionMap[key] }))

    const restaurant = {
      id:                seller.id,
      businessName:      seller.businessName,
      description:       seller.description,
      city:              seller.city,
      area:              seller.area,
      isOpen:            seller.isOpen,
      workingDays:       seller.workingDays,
      workingHours:      seller.workingHours,
      deliveryAvailable: seller.deliveryAvailable,
      averageRating:     Math.round(avg * 10) / 10,
      reviewCount:       seller.reviews.length,
      reviews:           seller.reviews,
      dishes,
      menuSections,
      dishCount:         dishes.length,
    }

    return NextResponse.json({ restaurant: JSON.parse(JSON.stringify(restaurant)) })
  } catch (error) {
    console.error('GET /api/restaurants/[id] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
