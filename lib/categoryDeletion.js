// Admin-only category deletion. The rules live here so the route and the
// tests run the same code.
//
// Invariants:
//  - A product never ends up without a valid category. Every product in the
//    category is either moved to the chosen destination, or hard-deleted.
//  - A product with order or stock history is never hard-deleted (OrderItem
//    and StockMovement reference its variants, and order history must stay
//    intact). It is hidden (isActive = false) and moved instead, and the
//    result reports it.
//  - The internal "Food" category holds restaurant dishes and is protected.
//  - Callers pass a Prisma client or an interactive-transaction client. The
//    route wraps the whole call in one $transaction, so a failure halfway
//    rolls everything back.

export class CategoryDeletionError extends Error {
  constructor(code, status = 409, extra = {}) {
    super(code)
    this.code = code
    this.status = status
    this.extra = extra
  }
}

async function loadCategory(db, categoryId) {
  const category = await db.category.findUnique({
    where:  { id: categoryId },
    select: { id: true, name: true, isInternal: true },
  })
  if (!category) throw new CategoryDeletionError('NOT_FOUND', 404)
  return category
}

// Every product in the category (active or not), with whether it has any
// order or stock history on any of its variants.
async function loadAffected(db, categoryId) {
  const rows = await db.product.findMany({
    where:   { categoryId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      variants: {
        select: { _count: { select: { orderItems: true, stockMovements: true } } },
      },
    },
  })
  return rows.map(p => ({
    id:         p.id,
    name:       p.name,
    hasHistory: p.variants.some(v => v._count.orderItems > 0 || v._count.stockMovements > 0),
  }))
}

async function loadDestinations(db, categoryId) {
  return db.category.findMany({
    where:   { isInternal: false, id: { not: categoryId } },
    orderBy: { name: 'asc' },
    select:  { id: true, name: true },
  })
}

// What the dialog shows before anything is deleted. Read-only.
export async function getDeletionPreview(db, categoryId) {
  const category        = await loadCategory(db, categoryId)
  const affected        = await loadAffected(db, categoryId)
  const masterProductCount = await db.masterProduct.count({ where: { categoryId } })
  return {
    category:           { id: category.id, name: category.name, isInternal: category.isInternal },
    productCount:       affected.length,
    historyProducts:    affected.filter(p => p.hasHistory).map(p => ({ id: p.id, name: p.name })),
    masterProductCount,
    destinations:       category.isInternal ? [] : await loadDestinations(db, categoryId),
  }
}

/**
 * Deletes a category, placing its products first.
 *
 * action 'move'   — every product moves to destinationId; none are deleted.
 * action 'delete' — products without history are deleted (confirmCount must
 *                   equal the current product count); products with history
 *                   are hidden and moved to destinationId.
 *
 * Returns { moved, deleted, deactivated: [{id, name}] }.
 */
export async function deleteCategory(db, categoryId, { action = 'delete', destinationId = null, confirmCount = null } = {}) {
  if (action !== 'move' && action !== 'delete') throw new CategoryDeletionError('BAD_ACTION', 400)

  const category = await loadCategory(db, categoryId)
  if (category.isInternal) throw new CategoryDeletionError('PROTECTED', 409)

  const affected     = await loadAffected(db, categoryId)
  const history      = affected.filter(p => p.hasHistory)
  const deletable    = affected.filter(p => !p.hasHistory)
  const masterCount  = await db.masterProduct.count({ where: { categoryId } })

  // The admin confirmed a specific count in the dialog; if the category has
  // changed since, make them look again rather than delete a different set.
  if (action === 'delete' && affected.length > 0 && confirmCount !== affected.length) {
    throw new CategoryDeletionError('COUNT_MISMATCH', 409, { productCount: affected.length })
  }

  const productsToMove = action === 'move' ? affected.length : history.length
  const needsDestination = productsToMove > 0 || masterCount > 0

  let destination = null
  if (needsDestination) {
    if (destinationId == null) throw new CategoryDeletionError('DESTINATION_REQUIRED', 400)
    destination = await db.category.findUnique({
      where:  { id: destinationId },
      select: { id: true, isInternal: true },
    })
    if (!destination || destination.id === categoryId || destination.isInternal) {
      throw new CategoryDeletionError('DESTINATION_INVALID', 400)
    }
  }

  let moved = 0
  let deleted = 0
  if (action === 'move') {
    if (affected.length) {
      await db.product.updateMany({
        where: { categoryId },
        data:  { categoryId: destination.id, subCategoryId: null },
      })
    }
    moved = affected.length
  } else {
    if (deletable.length) {
      await db.product.deleteMany({ where: { id: { in: deletable.map(p => p.id) } } })
    }
    if (history.length) {
      await db.product.updateMany({
        where: { id: { in: history.map(p => p.id) } },
        data:  { isActive: false, categoryId: destination.id, subCategoryId: null },
      })
    }
    deleted = deletable.length
    moved   = history.length
  }

  // Retired catalogue rows: always moved, never deleted (retailer products
  // reference them).
  if (masterCount) {
    await db.masterProduct.updateMany({ where: { categoryId }, data: { categoryId: destination.id } })
  }

  await db.subCategory.deleteMany({ where: { categoryId } })
  await db.category.delete({ where: { id: categoryId } })

  return {
    ok:          true,
    moved,
    deleted,
    deactivated: action === 'delete' ? history.map(p => ({ id: p.id, name: p.name })) : [],
  }
}
