import 'dotenv/config'
import { prisma } from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

// ─── Taxonomy ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Coffee & Jabana',         icon: 'coffee',   subCategories: ['Coffee Beans', 'Jabana Sets'] },
  { name: 'Tea & Drinks',            icon: 'tea',      subCategories: ['Karkade', 'Aradaib & Tabaldi', 'Gongolez'] },
  { name: 'Spices & Seasonings',     icon: 'spices',   subCategories: ['Shatta', 'Kombo', 'Sumbula'] },
  { name: 'Dakwa & Peanut Products', icon: 'dakwa',    subCategories: ['Dakwa', 'Peanut Products'] },
  { name: 'Weika & Dried Goods',     icon: 'dried',    subCategories: ['Weika', 'Dried Vegetables'] },
  { name: 'Grains & Flour',          icon: 'grains',   subCategories: ['Dura', 'Kisra Flour', 'Aseeda'] },
  { name: 'Oils & Ghee',             icon: 'oils',     subCategories: ['Sirij (Sesame Oil)', 'Ghee'] },
  { name: 'Sweets & Snacks',         icon: 'sweets',   subCategories: ['Tahniya', 'Sesame Bars'] },
  { name: 'Bakhour & Perfumes',      icon: 'bakhour',  subCategories: ['Khumra', 'Dilka', 'Sandalia'] },
  { name: 'Heritage Clothing',       icon: 'clothing', subCategories: ['Thobe', 'Taqiya', 'Markoub'] },
  { name: 'Homeware & Handicrafts',  icon: 'homeware', subCategories: ['Jabana Sets', 'Birish'] },
]

// ─── Users ────────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  email:        'admin@wasla.com',
  password:     'admin1234',
  role:         'admin',
}

const SELLER_USER = {
  email:        'seller@wasla.com',
  password:     'seller1234',
  role:         'retailer',
  city:         'Cairo',
  businessName: 'Kassala Coffee House',
}

const SELLER2_USER = {
  email:        'seller2@wasla.com',
  password:     'seller2024',
  role:         'retailer',
  city:         'Giza',
  businessName: 'Ard El Lewa Sudanese Market',
}

// ─── Products ─────────────────────────────────────────────────────────────────
// NOTE: Wasla is a marketplace for Sudanese products (not vapes). Demo vape
// product/variant seed data has been removed pending real Wasla catalog data.
// These arrays are intentionally empty — categories and users still seed below.

const PRODUCTS = []

// ─── Products — Seller 2 ─────────────────────────────────────────────────────

const PRODUCTS_SELLER2 = []

// ─── Helpers ──────────────────────────────────────────────────────────────────

function skip(msg) { console.log(`  [SKIP]  ${msg}`) }
function ok(msg)   { console.log(`  [OK]    ${msg}`) }

// ─── Seed functions ───────────────────────────────────────────────────────────

async function seedCategories() {
  console.log('\n[Categories & SubCategories]')

  for (const cat of CATEGORIES) {
    let category = await prisma.category.findFirst({ where: { name: cat.name } })

    if (!category) {
      category = await prisma.category.create({
        data: { name: cat.name, icon: cat.icon },
      })
      ok(`Created category: ${cat.name}`)
    } else {
      skip(`Category already exists: ${cat.name}`)
    }

    for (const subName of cat.subCategories) {
      const exists = await prisma.subCategory.findFirst({
        where: { name: subName, categoryId: category.id },
      })
      if (!exists) {
        await prisma.subCategory.create({
          data: { name: subName, categoryId: category.id },
        })
        ok(`  Created subcategory: ${subName}`)
      } else {
        skip(`  SubCategory already exists: ${subName}`)
      }
    }
  }
}

async function seedAdmin() {
  console.log('\n[Admin User]')

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_USER.email } })
  if (existing) {
    skip(`Admin already exists: ${ADMIN_USER.email}`)
    return
  }

  const passwordHash = await bcrypt.hash(ADMIN_USER.password, 10)
  await prisma.user.create({
    data: {
      email:        ADMIN_USER.email,
      passwordHash,
      role:         ADMIN_USER.role,
    },
  })
  ok(`Created admin: ${ADMIN_USER.email}`)
}

async function seedSeller() {
  console.log('\n[Seller User]')

  const existing = await prisma.user.findUnique({ where: { email: SELLER_USER.email } })
  if (existing) {
    skip(`Seller already exists: ${SELLER_USER.email}`)
    return existing
  }

  const passwordHash = await bcrypt.hash(SELLER_USER.password, 10)
  const user = await prisma.user.create({
    data: {
      email:        SELLER_USER.email,
      passwordHash,
      role:         SELLER_USER.role,
      city:         SELLER_USER.city,
      sellerProfile: {
        create: {
          businessName:      SELLER_USER.businessName,
          city:              SELLER_USER.city,
          approvedByAdmin:   true,
          deliveryAvailable: true,
        },
      },
    },
    include: { sellerProfile: true },
  })
  ok(`Created seller: ${SELLER_USER.email} (profile id: ${user.sellerProfile.id})`)
  return user
}

async function seedProducts(sellerUser) {
  console.log('\n[Products]')

  // Get the seller profile (works whether we just created it or it already existed)
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerUser.id },
  })
  if (!sellerProfile) {
    console.error('  ERROR: Seller profile not found — cannot seed products.')
    return
  }

  // Locate the "Coffee & Jabana" category and "Coffee Beans" subcategory
  const category = await prisma.category.findFirst({ where: { name: 'Coffee & Jabana' } })
  if (!category) {
    console.error('  ERROR: "Coffee & Jabana" category not found — run category seed first.')
    return
  }
  const subCategory = await prisma.subCategory.findFirst({
    where: { name: 'Coffee Beans', categoryId: category.id },
  })

  for (const product of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name, sellerId: sellerProfile.id },
    })

    if (existing) {
      skip(`Product already exists: ${product.name}`)
      continue
    }

    const created = await prisma.product.create({
      data: {
        sellerId:      sellerProfile.id,
        categoryId:    category.id,
        subCategoryId: subCategory?.id ?? null,
        brand:         product.brand,
        name:          product.name,
        description:   product.description,
        variants: {
          create: product.variants.map(v => ({
            label:         v.label,
            price:      v.price,
            stockQty:      v.stockQty,
            skuCode:       v.skuCode,
          })),
        },
      },
      include: { variants: true },
    })

    ok(`Created product: ${created.name} (${created.variants.length} variants)`)
  }
}

async function seedSeller2() {
  console.log('\n[Seller 2 — Ard El Lewa Sudanese Market]')

  const existing = await prisma.user.findUnique({ where: { email: SELLER2_USER.email } })
  if (existing) {
    skip(`Seller already exists: ${SELLER2_USER.email}`)
    return existing
  }

  const passwordHash = await bcrypt.hash(SELLER2_USER.password, 10)
  const user = await prisma.user.create({
    data: {
      email:        SELLER2_USER.email,
      passwordHash,
      role:         SELLER2_USER.role,
      city:         SELLER2_USER.city,
      sellerProfile: {
        create: {
          businessName:      SELLER2_USER.businessName,
          city:              SELLER2_USER.city,
          approvedByAdmin:   true,
          deliveryAvailable: true,
        },
      },
    },
    include: { sellerProfile: true },
  })
  ok(`Created seller: ${SELLER2_USER.email} (profile id: ${user.sellerProfile.id})`)
  return user
}

async function seedProductsSeller2(sellerUser) {
  console.log('\n[Products — Ard El Lewa Sudanese Market]')

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerUser.id },
  })
  if (!sellerProfile) {
    console.error('  ERROR: Seller 2 profile not found — cannot seed products.')
    return
  }

  const category = await prisma.category.findFirst({ where: { name: 'Coffee & Jabana' } })
  if (!category) {
    console.error('  ERROR: "Coffee & Jabana" category not found — run category seed first.')
    return
  }
  const subCategory = await prisma.subCategory.findFirst({
    where: { name: 'Coffee Beans', categoryId: category.id },
  })

  for (const product of PRODUCTS_SELLER2) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name, sellerId: sellerProfile.id },
    })

    if (existing) {
      skip(`Product already exists: ${product.name}`)
      continue
    }

    const created = await prisma.product.create({
      data: {
        sellerId:      sellerProfile.id,
        categoryId:    category.id,
        subCategoryId: subCategory?.id ?? null,
        brand:         product.brand,
        name:          product.name,
        description:   product.description,
        variants: {
          create: product.variants.map(v => ({
            label:     v.label,
            price:  v.price,
            stockQty:  v.stockQty,
            skuCode:   v.skuCode,
          })),
        },
      },
      include: { variants: true },
    })

    ok(`Created product: ${created.name} (${created.variants.length} variants)`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding Wasla database...')

  await seedCategories()
  await seedAdmin()
  await seedSeller()

  const sellerUser = await prisma.user.findUnique({ where: { email: SELLER_USER.email } })
  await seedProducts(sellerUser)

  await seedSeller2()

  const seller2User = await prisma.user.findUnique({ where: { email: SELLER2_USER.email } })
  await seedProductsSeller2(seller2User)

  console.log('\nDone.\n')
}

main()
  .catch(err => {
    console.error('\nSeed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
