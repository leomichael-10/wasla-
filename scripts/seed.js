import 'dotenv/config'
import { prisma } from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

// ─── Taxonomy ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    name: 'Devices',
    icon: 'devices',
    subCategories: ['Pods', 'Mods'],
  },
  {
    name: 'Disposables',
    icon: 'disposables',
    subCategories: ['Disposable Puffs'],
  },
  {
    name: 'Juices & E-Liquids',
    icon: 'juices',
    subCategories: ['MTL Salt Nicotine', 'MTL Free Base', 'DTL Salt Nicotine', 'DTL Free Base'],
  },
  {
    name: 'Spareparts',
    icon: 'spareparts',
    subCategories: ['Coils', 'Tanks', 'Accessories', 'Batteries'],
  },
  {
    name: 'Other Smoking Products',
    icon: 'other',
    subCategories: ['Cigarettes', 'Dokha'],
  },
]

// ─── Users ────────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  email:        'admin@tobaki.com',
  password:     'admin1234',
  role:         'admin',
}

const SELLER_USER = {
  email:        'seller@tobaki.com',
  password:     'seller1234',
  role:         'retailer',
  city:         'Dubai',
  businessName: 'Dubai Vape Store',
}

const SELLER2_USER = {
  email:        'seller2@tobaki.com',
  password:     'seller2024',
  role:         'retailer',
  city:         'Abu Dhabi',
  businessName: 'Abu Dhabi Vape House',
}

// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCTS = [
  // Elf Bar 5000
  {
    brand: 'Elf Bar',
    name:  'Elf Bar BC5000',
    description: 'Compact rechargeable disposable with a mesh coil for smooth hits.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 5000, nicotineLevel: '5%', priceAed: 25, stockQty: 50, skuCode: 'ELF-BC5000-WM' },
      { flavor: 'Mango Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 25, stockQty: 50, skuCode: 'ELF-BC5000-MG' },
      { flavor: 'Grape Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 25, stockQty: 50, skuCode: 'ELF-BC5000-GR' },
      { flavor: 'Peach Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 25, stockQty: 50, skuCode: 'ELF-BC5000-PC' },
    ],
  },
  // Elf Bar 10000
  {
    brand: 'Elf Bar',
    name:  'Elf Bar BC10000',
    description: 'High-capacity disposable with dual-mesh coil and fast-charge USB-C.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 10000, nicotineLevel: '5%', priceAed: 35, stockQty: 50, skuCode: 'ELF-BC10K-WM' },
      { flavor: 'Mango Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 35, stockQty: 50, skuCode: 'ELF-BC10K-MG' },
      { flavor: 'Grape Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 35, stockQty: 50, skuCode: 'ELF-BC10K-GR' },
      { flavor: 'Peach Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 35, stockQty: 50, skuCode: 'ELF-BC10K-PC' },
    ],
  },
  // Vozol 5000
  {
    brand: 'Vozol',
    name:  'Vozol Star 5000',
    description: 'Ergonomic cylindrical disposable with a smooth draw activation.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 5000, nicotineLevel: '5%', priceAed: 20, stockQty: 50, skuCode: 'VOZ-ST5K-WM' },
      { flavor: 'Mango Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 20, stockQty: 50, skuCode: 'VOZ-ST5K-MG' },
      { flavor: 'Grape Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 20, stockQty: 50, skuCode: 'VOZ-ST5K-GR' },
    ],
  },
  // Vozol 10000
  {
    brand: 'Vozol',
    name:  'Vozol Gear 10000',
    description: 'Premium disposable with a digital battery indicator and adjustable airflow.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 10000, nicotineLevel: '5%', priceAed: 30, stockQty: 50, skuCode: 'VOZ-GR10K-WM' },
      { flavor: 'Mango Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 30, stockQty: 50, skuCode: 'VOZ-GR10K-MG' },
      { flavor: 'Peach Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 30, stockQty: 50, skuCode: 'VOZ-GR10K-PC' },
    ],
  },
  // Lost Mary 5000
  {
    brand: 'Lost Mary',
    name:  'Lost Mary MO5000',
    description: 'Slim disposable with a classic rounded design and consistent vapour output.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 5000, nicotineLevel: '5%', priceAed: 22, stockQty: 50, skuCode: 'LM-MO5K-WM' },
      { flavor: 'Mango Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 22, stockQty: 50, skuCode: 'LM-MO5K-MG' },
      { flavor: 'Grape Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 22, stockQty: 50, skuCode: 'LM-MO5K-GR' },
      { flavor: 'Peach Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 22, stockQty: 50, skuCode: 'LM-MO5K-PC' },
    ],
  },
  // Lost Mary 10000
  {
    brand: 'Lost Mary',
    name:  'Lost Mary BM10000',
    description: 'High-puff count with mesh coil technology and a rechargeable 600 mAh battery.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 10000, nicotineLevel: '5%', priceAed: 32, stockQty: 50, skuCode: 'LM-BM10K-WM' },
      { flavor: 'Mango Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 32, stockQty: 50, skuCode: 'LM-BM10K-MG' },
      { flavor: 'Peach Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 32, stockQty: 50, skuCode: 'LM-BM10K-PC' },
    ],
  },
  // Elf Bar 15000
  {
    brand: 'Elf Bar',
    name:  'Elf Bar TE15000',
    description: 'Ultra-high capacity with a dual-mesh coil and a smart display screen.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 10000, nicotineLevel: '5%', priceAed: 35, stockQty: 50, skuCode: 'ELF-TE15K-WM' },
      { flavor: 'Grape Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 35, stockQty: 50, skuCode: 'ELF-TE15K-GR' },
    ],
  },
  // Vozol Neon
  {
    brand: 'Vozol',
    name:  'Vozol Neon 10000',
    description: 'Eye-catching transparent design with a smooth mesh coil and draw activation.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 10000, nicotineLevel: '5%', priceAed: 28, stockQty: 50, skuCode: 'VOZ-NE10K-WM' },
      { flavor: 'Mango Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 28, stockQty: 50, skuCode: 'VOZ-NE10K-MG' },
      { flavor: 'Peach Ice',      puffCount: 10000, nicotineLevel: '5%', priceAed: 28, stockQty: 50, skuCode: 'VOZ-NE10K-PC' },
    ],
  },
  // Lost Mary Tappo
  {
    brand: 'Lost Mary',
    name:  'Lost Mary Tappo',
    description: 'Compact pod-style disposable, easy to carry and consistent flavour delivery.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 5000, nicotineLevel: '5%', priceAed: 15, stockQty: 50, skuCode: 'LM-TP5K-WM' },
      { flavor: 'Mango Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 15, stockQty: 50, skuCode: 'LM-TP5K-MG' },
    ],
  },
  // Elf Bar Crystal
  {
    brand: 'Elf Bar',
    name:  'Elf Bar Crystal CR5000',
    description: 'Faceted crystal shell with a pre-filled mesh coil and wide airflow.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 5000, nicotineLevel: '5%', priceAed: 26, stockQty: 50, skuCode: 'ELF-CR5K-WM' },
      { flavor: 'Mango Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 26, stockQty: 50, skuCode: 'ELF-CR5K-MG' },
      { flavor: 'Grape Ice',      puffCount: 5000, nicotineLevel: '5%', priceAed: 26, stockQty: 50, skuCode: 'ELF-CR5K-GR' },
    ],
  },
]

// ─── Products — Seller 2 (Abu Dhabi Vape House) ──────────────────────────────

const PRODUCTS_SELLER2 = [
  {
    brand: 'Nasty',
    name:  'Nasty Bolt 50K',
    description: 'High-capacity disposable with smooth salt nicotine delivery and extended battery life.',
    variants: [
      { flavor: 'Strawberry Kiwi', puffCount: 50000, priceAed: 23, stockQty: 30, skuCode: 'NB-50K-SK' },
      { flavor: 'Grape Ice',       puffCount: 50000, priceAed: 23, stockQty: 30, skuCode: 'NB-50K-GR' },
      { flavor: 'Mango Ice',       puffCount: 50000, priceAed: 23, stockQty: 30, skuCode: 'NB-50K-MG' },
    ],
  },
  {
    brand: 'Elux',
    name:  'Elux 50K',
    description: 'Premium disposable with a dual-mesh coil and long-lasting 50,000 puff capacity.',
    variants: [
      { flavor: 'Mango Passion Fruit', puffCount: 50000, priceAed: 26, stockQty: 25, skuCode: 'ELX-50K-MPF' },
      { flavor: 'Watermelon Ice',      puffCount: 50000, priceAed: 26, stockQty: 25, skuCode: 'ELX-50K-WM'  },
      { flavor: 'Mixed Berry',         puffCount: 50000, priceAed: 26, stockQty: 25, skuCode: 'ELX-50K-MB'  },
    ],
  },
  {
    brand: 'Lost Mary',
    name:  'Lost Mary BM600',
    description: 'Compact single-use disposable, perfect for on-the-go with consistent flavour.',
    variants: [
      { flavor: 'Blueberry Ice',  puffCount: 600, priceAed: 15, stockQty: 100, skuCode: 'LM-BM600-BL' },
      { flavor: 'Watermelon Ice', puffCount: 600, priceAed: 15, stockQty: 100, skuCode: 'LM-BM600-WM' },
      { flavor: 'Peach Ice',      puffCount: 600, priceAed: 15, stockQty: 100, skuCode: 'LM-BM600-PC' },
    ],
  },
  {
    brand: 'Vozol',
    name:  'Vozol Star 9000',
    description: 'Ergonomic star-shaped disposable with a mesh coil and draw-activated firing.',
    variants: [
      { flavor: 'Lychee Ice',     puffCount: 9000, priceAed: 28, stockQty: 40, skuCode: 'VOZ-ST9K-LY' },
      { flavor: 'Watermelon Ice', puffCount: 9000, priceAed: 28, stockQty: 40, skuCode: 'VOZ-ST9K-WM' },
      { flavor: 'Blue Razz Ice',  puffCount: 9000, priceAed: 28, stockQty: 40, skuCode: 'VOZ-ST9K-BR' },
    ],
  },
  {
    brand: 'Elf Bar',
    name:  'Elf Bar Lowit',
    description: 'Slim rechargeable pod-style disposable with replaceable pods and USB-C charging.',
    variants: [
      { flavor: 'Watermelon Ice', puffCount: 5500, priceAed: 20, stockQty: 60, skuCode: 'ELF-LW-WM' },
      { flavor: 'Mango Ice',      puffCount: 5500, priceAed: 20, stockQty: 60, skuCode: 'ELF-LW-MG' },
      { flavor: 'Peach Ice',      puffCount: 5500, priceAed: 20, stockQty: 60, skuCode: 'ELF-LW-PC' },
    ],
  },
]

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
      ageVerified:  true,
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
      ageVerified:  true,
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

  // Locate the "Disposables" category and "Disposable Puffs" subcategory
  const category = await prisma.category.findFirst({ where: { name: 'Disposables' } })
  if (!category) {
    console.error('  ERROR: "Disposables" category not found — run category seed first.')
    return
  }
  const subCategory = await prisma.subCategory.findFirst({
    where: { name: 'Disposable Puffs', categoryId: category.id },
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
            flavor:        v.flavor,
            nicotineLevel: v.nicotineLevel,
            puffCount:     v.puffCount,
            priceAed:      v.priceAed,
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
  console.log('\n[Seller 2 — Abu Dhabi Vape House]')

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
      ageVerified:  true,
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
  console.log('\n[Products — Abu Dhabi Vape House]')

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerUser.id },
  })
  if (!sellerProfile) {
    console.error('  ERROR: Seller 2 profile not found — cannot seed products.')
    return
  }

  const category = await prisma.category.findFirst({ where: { name: 'Disposables' } })
  if (!category) {
    console.error('  ERROR: "Disposables" category not found — run category seed first.')
    return
  }
  const subCategory = await prisma.subCategory.findFirst({
    where: { name: 'Disposable Puffs', categoryId: category.id },
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
            flavor:    v.flavor,
            puffCount: v.puffCount,
            priceAed:  v.priceAed,
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
  console.log('Seeding Tobaki database...')

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
