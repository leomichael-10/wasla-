// Single source of truth: Category.icon (DB slug, seeded in scripts/seed.js)
// → the illustrated category artwork under public/categories/. Keyed by the
// real DB slug, not the display name, so it survives renames/relabeling of
// categories. Drop a PNG at the given path and it lights up automatically —
// no code change needed.
const CATEGORY_IMAGE_MAP = {
  coffee:   '/categories/coffee-jabana.png',
  tea:      '/categories/tea-drinks.png',
  spices:   '/categories/spices.png',
  dakwa:    '/categories/dakwa-peanut.png',
  dried:    '/categories/weika-dried.png',
  grains:   '/categories/grains-flour.png',
  oils:     '/categories/oils-ghee.png',
  sweets:   '/categories/sweets-snacks.png',
  bakhour:  '/categories/bakhour-perfumes.png',
  clothing: '/categories/heritage-clothing.png',
  homeware: '/categories/homeware-handicrafts.png',
}

/** Illustrated icon path for a Category.icon slug, or null if the slug is unmapped. */
export function categoryImageSrc(slug) {
  if (!slug) return null
  return CATEGORY_IMAGE_MAP[slug] ?? null
}
