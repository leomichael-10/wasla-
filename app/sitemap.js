import { prisma } from '../lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wasla-249.com'

export default async function sitemap() {
  const staticRoutes = ['', '/products', '/shops', '/browse', '/terms', '/privacy'].map(path => ({
    url:         `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority:    path === '' ? 1 : 0.7,
  }))

  let productRoutes = []
  let shopRoutes     = []
  try {
    const [products, shops] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true, seller: { isOpen: true } }, select: { id: true, createdAt: true }, take: 5000 }),
      prisma.sellerProfile.findMany({ where: { approvedByAdmin: true, isOpen: true }, select: { id: true, createdAt: true }, take: 2000 }),
    ])
    productRoutes = products.map(p => ({
      url:          `${BASE_URL}/products/${p.id}`,
      lastModified: p.createdAt,
      changeFrequency: 'weekly',
      priority:     0.6,
    }))
    shopRoutes = shops.map(s => ({
      url:          `${BASE_URL}/shops/${s.id}`,
      lastModified: s.createdAt,
      changeFrequency: 'weekly',
      priority:     0.6,
    }))
  } catch {
    // Sitemap generation shouldn't fail the build if the DB is unreachable at build time.
  }

  return [...staticRoutes, ...productRoutes, ...shopRoutes]
}
