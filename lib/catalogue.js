// The one definition of "a product a customer can see". Every catalogue
// surface imports these — /api/products (browse + search), /api/shops/[id]
// (a shop's own list), and the home page's rails and category counts — so
// they cannot drift apart again. Spread into a fresh object before
// modifying; never mutate these constants.
export const CATALOGUE_WHERE = {
  isActive: true,
  seller:   { isOpen: true, sellerType: 'SHOP' },
  // A product with no variant can't be priced or added to cart.
  variants: { some: {} },
}

export const CATALOGUE_INCLUDE = {
  variants: {
    select:  { id: true, label: true, price: true, stockQty: true, image: true },
    orderBy: { price: 'asc' },
  },
  seller:   { select: { id: true, businessName: true, city: true, area: true, isOpen: true, deliveryAvailable: true } },
  category: { select: { id: true, name: true, icon: true } },
}

export function toCatalogueProducts(rows) {
  return rows.map(p => ({
    ...p,
    variants: p.variants.map(v => ({ ...v, inStock: v.stockQty > 0 })),
  }))
}
