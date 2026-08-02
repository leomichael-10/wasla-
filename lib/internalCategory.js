import { prisma } from './prisma'

// The single internal-only category every restaurant dish is auto-filed
// under (slug "food", isInternal: true — see prisma/schema.prisma and
// scripts/seed.js). Restaurant sellers never choose a category; the
// server assigns this one on every create/update, regardless of what
// (if anything) the client sends.
export async function getInternalFoodCategoryId() {
  const category = await prisma.category.findFirst({ where: { isInternal: true } })
  if (!category) throw new Error('Internal food category not seeded — run `npm run seed`.')
  return category.id
}
