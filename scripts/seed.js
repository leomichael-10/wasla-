import 'dotenv/config'
import { prisma } from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

// Idempotent: every section checks for an existing row before creating —
// safe to re-run any time (e.g. after a DB wipe/branch reset). All demo
// product SKUs are prefixed DEMO- so they can be found and wiped in one
// query once real shop data replaces them:
//   prisma.productVariant.deleteMany({ where: { skuCode: { startsWith: 'DEMO-' } } })
//   then prisma.product.deleteMany({ where: { variants: { none: {} } } })
//
// Does NOT seed orders or customer accounts — only categories, zones,
// demo shops, and demo products (see PROGRESS.md "Recovery reseed").

// ─── Taxonomy ────────────────────────────────────────────────────────────────
// Two customer-facing categories only (2026-08-02 recovery reseed —
// consolidated from the original 11). "Our Local Products" covers every
// edible/grocery good; subcategories preserve the old groupings so
// browsing a 9-categories-wide bucket still has structure. "Food" is
// INTERNAL ONLY (isInternal: true) — every restaurant dish is auto-filed
// here server-side (see lib/internalCategory.js); it must never be
// customer-facing, so it carries no icon and no subcategories.

const CATEGORIES = [
  {
    name: 'Our Local Products',
    icon: 'coffee',
    isInternal: false,
    subCategories: [
      'Jibna (Cheese)', 'Dakwa & Peanut Products', 'Oils & Ghee', 'Grains & Flour',
      'Weika & Dried Goods', 'Coffee & Jabana', 'Tea & Drinks', 'Spices & Seasonings', 'Sweets & Snacks',
    ],
  },
  {
    name: 'Bakhour & Perfumes',
    icon: 'bakhour',
    isInternal: false,
    subCategories: [],
  },
  {
    name: 'Food',
    icon: null,
    isInternal: true,
    subCategories: [],
  },
]

// ─── Users ────────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  email:    'admin@wasla.com',
  password: 'admin1234',
  role:     'admin',
}

// ─── Demo shops (3) ────────────────────────────────────────────────────────
// Areas match the new zone set (Step 3) so zone coverage below lines up.

const SHOPS = [
  {
    email:          'seller@wasla.com',
    password:       'seller1234',
    role:           'retailer',
    city:           'Cairo',
    area:           'Heliopolis',
    businessName:   'Kassala Coffee House',
    whatsappNumber: '201001234567',
    descriptionAr:  'قهوة وتوابل سودانية أصيلة توصلك لبيتك.',
  },
  {
    email:          'seller2@wasla.com',
    password:       'seller2024',
    role:           'retailer',
    city:           'Cairo',
    area:           'Madinaty',
    businessName:   'Masr El Gedida Sudanese Market',
    whatsappNumber: '201002345678',
    descriptionAr:  'جبنة ودكوة ومنتجات سودانية يومية بأسعار مناسبة.',
  },
  {
    email:          'seller3@wasla.com',
    password:       'seller3024',
    role:           'retailer',
    city:           'Cairo',
    area:           'Nasr City',
    businessName:   'Bayt Al Sudan Heritage Store',
    whatsappNumber: '201003456789',
    descriptionAr:  'بخور وعطور سودانية تراثية أصلية.',
  },
]

// ─── Demo products across the two categories ─────────────────────────────
// shop: index into SHOPS. subCategory: looked up by name at seed time
// (only meaningful for "Our Local Products").

const PRODUCTS = [
  // Kassala Coffee House (shop 0) — coffee, tea, spices
  { shop: 0, category: 'Our Local Products', subCategory: 'Coffee & Jabana', name: 'Bun Kassala', brand: 'Kassala',
    description: 'Traditional Sudanese roasted coffee beans from Kassala.', unitType: 'GRAM', sellByWeight: true, originRegion: 'Kassala', storage: 'AMBIENT',
    variants: [
      { label: '250g', price: 180, stockQty: 40, skuCode: 'DEMO-BUN-KSL-250' },
      { label: '500g', price: 340, stockQty: 30, skuCode: 'DEMO-BUN-KSL-500' },
      { label: '1kg',  price: 640, stockQty: 15, skuCode: 'DEMO-BUN-KSL-1000' },
    ] },
  { shop: 0, category: 'Our Local Products', subCategory: 'Coffee & Jabana', name: 'Traditional Jabana Coffee Set', brand: 'Kassala',
    description: 'Clay jabana pot with cups for Sudanese coffee ceremony.', unitType: 'PIECE', isHeritageGood: true, storage: 'AMBIENT',
    variants: [ { label: 'Standard', price: 450, stockQty: 12, skuCode: 'DEMO-JABANA-SET-STD' } ] },
  { shop: 0, category: 'Our Local Products', subCategory: 'Tea & Drinks', name: 'Karkade (Dried Hibiscus)', brand: 'Kassala',
    description: 'Dried hibiscus flowers for Sudanese karkade tea.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [
      { label: '250g', price: 90, stockQty: 50, skuCode: 'DEMO-KARKADE-250' },
      { label: '500g', price: 170, stockQty: 25, skuCode: 'DEMO-KARKADE-500' },
    ] },
  { shop: 0, category: 'Our Local Products', subCategory: 'Tea & Drinks', name: 'Gongolez (Baobab Powder)', brand: 'Kassala',
    description: 'Ground baobab fruit powder, used for gongolez drink.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '300g', price: 130, stockQty: 20, skuCode: 'DEMO-GONGOLEZ-300' } ] },
  { shop: 0, category: 'Our Local Products', subCategory: 'Spices & Seasonings', name: 'Shatta (Sudanese Chili Paste)', brand: 'Kassala',
    description: 'Spicy fermented chili condiment.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 60, storage: 'CHILLED',
    variants: [ { label: '200g Jar', price: 75, stockQty: 35, skuCode: 'DEMO-SHATTA-200' } ] },
  { shop: 0, category: 'Our Local Products', subCategory: 'Spices & Seasonings', name: 'Kombo Spice Mix', brand: 'Kassala',
    description: 'Traditional ground spice blend for stews.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '150g', price: 65, stockQty: 40, skuCode: 'DEMO-KOMBO-150' } ] },
  { shop: 0, category: 'Our Local Products', subCategory: 'Oils & Ghee', name: 'Sirij Sesame Oil', brand: 'Kassala',
    description: 'Cold-pressed sesame oil.', unitType: 'MILLILITER', isPerishable: true, shelfLifeDays: 365, storage: 'AMBIENT',
    variants: [
      { label: '500ml', price: 210, stockQty: 20, skuCode: 'DEMO-SIRIJ-500' },
      { label: '1L',    price: 390, stockQty: 12, skuCode: 'DEMO-SIRIJ-1000' },
    ] },

  // Masr El Gedida Sudanese Market (shop 1) — jibna, grains, dakwa, dried goods, sweets
  { shop: 1, category: 'Our Local Products', subCategory: 'Jibna (Cheese)', name: 'Jibna Beida (White Cheese)', brand: 'Masr El Gedida',
    description: 'Traditional Sudanese white brined cheese.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 30, storage: 'CHILLED',
    variants: [
      { label: '500g', price: 150, stockQty: 25, skuCode: 'DEMO-JIBNA-500' },
      { label: '1kg',  price: 280, stockQty: 12, skuCode: 'DEMO-JIBNA-1000' },
    ] },
  { shop: 1, category: 'Our Local Products', subCategory: 'Grains & Flour', name: 'Dura (Sudanese Sorghum)', brand: 'Masr El Gedida',
    description: 'Whole sorghum grain, staple Sudanese cereal.', unitType: 'KILOGRAM', sellByWeight: true, originRegion: 'Gedaref', storage: 'AMBIENT',
    variants: [
      { label: '1kg', price: 60, stockQty: 60, skuCode: 'DEMO-DURA-1000' },
      { label: '5kg', price: 280, stockQty: 20, skuCode: 'DEMO-DURA-5000' },
    ] },
  { shop: 1, category: 'Our Local Products', subCategory: 'Grains & Flour', name: 'Kisra Flour', brand: 'Masr El Gedida',
    description: 'Fermented sorghum flour for making kisra bread.', unitType: 'KILOGRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '1kg', price: 75, stockQty: 35, skuCode: 'DEMO-KISRA-1000' } ] },
  { shop: 1, category: 'Our Local Products', subCategory: 'Dakwa & Peanut Products', name: 'Dakwa (Peanut Butter Spread)', brand: 'Masr El Gedida',
    description: 'Traditional Sudanese roasted peanut spread.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 120, storage: 'AMBIENT',
    variants: [
      { label: '250g Jar', price: 95, stockQty: 30, skuCode: 'DEMO-DAKWA-250' },
      { label: '500g Jar', price: 175, stockQty: 18, skuCode: 'DEMO-DAKWA-500' },
    ] },
  { shop: 1, category: 'Our Local Products', subCategory: 'Dakwa & Peanut Products', name: 'Roasted Peanuts (Fol Sudani)', brand: 'Masr El Gedida',
    description: 'Roasted and salted Sudanese peanuts.', unitType: 'GRAM', sellByWeight: true, isPerishable: true, shelfLifeDays: 90, storage: 'AMBIENT',
    variants: [ { label: '400g', price: 85, stockQty: 40, skuCode: 'DEMO-PEANUT-400' } ] },
  { shop: 1, category: 'Our Local Products', subCategory: 'Weika & Dried Goods', name: 'Weika (Dried Okra Powder)', brand: 'Masr El Gedida',
    description: 'Ground dried okra for weika stew.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '200g', price: 80, stockQty: 25, skuCode: 'DEMO-WEIKA-200' } ] },
  { shop: 1, category: 'Our Local Products', subCategory: 'Sweets & Snacks', name: 'Tahniya (Sesame Halva)', brand: 'Masr El Gedida',
    description: 'Sweet sesame paste confection.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 45, storage: 'AMBIENT',
    variants: [ { label: '400g', price: 100, stockQty: 22, skuCode: 'DEMO-TAHNIYA-400' } ] },
  { shop: 1, category: 'Our Local Products', subCategory: 'Oils & Ghee', name: 'Sudanese Ghee (Samn)', brand: 'Masr El Gedida',
    description: 'Clarified butter, traditional Sudanese ghee.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 270, storage: 'AMBIENT',
    variants: [
      { label: '500g Jar', price: 260, stockQty: 15, skuCode: 'DEMO-GHEE-500' },
      { label: '1kg Jar',  price: 490, stockQty: 8,  skuCode: 'DEMO-GHEE-1000' },
    ] },

  // Bayt Al Sudan Heritage Store (shop 2) — bakhour & perfumes
  { shop: 2, category: 'Bakhour & Perfumes', subCategory: null, name: 'Khumra Bakhour Blend', brand: 'Bayt Al Sudan',
    description: 'Traditional Sudanese scented wood incense blend.', unitType: 'GRAM', storage: 'AMBIENT',
    variants: [ { label: '100g', price: 220, stockQty: 20, skuCode: 'DEMO-KHUMRA-100' } ] },
  { shop: 2, category: 'Bakhour & Perfumes', subCategory: null, name: 'Dilka Perfumed Body Scrub', brand: 'Bayt Al Sudan',
    description: 'Traditional fragrant body scrub paste.', unitType: 'GRAM', storage: 'AMBIENT',
    variants: [ { label: '150g', price: 140, stockQty: 18, skuCode: 'DEMO-DILKA-150' } ] },
  { shop: 2, category: 'Bakhour & Perfumes', subCategory: null, name: 'Sandalia Sandalwood Perfume Oil', brand: 'Bayt Al Sudan',
    description: 'Concentrated sandalwood perfume oil.', unitType: 'MILLILITER', storage: 'AMBIENT',
    variants: [ { label: '30ml', price: 180, stockQty: 15, skuCode: 'DEMO-SANDALIA-30' } ] },
]

// ─── Delivery zones (2026-08-02 recovery reseed) ─────────────────────────
// New Cairo / Heliopolis–Nasr City corridor, per the brief.

const ZONES = [
  { nameEn: 'Heliopolis', nameAr: 'مصر الجديدة', districts: ['Heliopolis'], baseFee: 25, etaMinutes: 90 },
  { nameEn: 'El Rehab',   nameAr: 'الرحاب',       districts: ['El Rehab'],   baseFee: 30, etaMinutes: 100 },
  { nameEn: 'Madinaty',   nameAr: 'مدينتي',       districts: ['Madinaty'],   baseFee: 35, etaMinutes: 110 },
  { nameEn: 'Nasr City',  nameAr: 'مدينة نصر',     districts: ['Nasr City'],  baseFee: 25, etaMinutes: 90 },
  { nameEn: 'El Nozha',   nameAr: 'النزهة',       districts: ['El Nozha'],   baseFee: 25, etaMinutes: 90 },
]

// Which demo shops cover which zones (by zone nameEn), with optional overrides.
const ZONE_COVERAGE = [
  { shop: 0, zone: 'Heliopolis', cutoffTime: '18:00' },
  { shop: 0, zone: 'El Nozha',   cutoffTime: '18:00' },
  { shop: 1, zone: 'Madinaty',   cutoffTime: '17:00', minOrderValue: 100 },
  { shop: 1, zone: 'El Rehab',   cutoffTime: '17:00', minOrderValue: 100 },
  { shop: 2, zone: 'Nasr City',  cutoffTime: '19:00' },
  { shop: 2, zone: 'Heliopolis', cutoffTime: '19:00', feeOverride: 40 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function skip(msg) { console.log(`  [SKIP]  ${msg}`) }
function ok(msg)   { console.log(`  [OK]    ${msg}`) }

// ─── Seed functions ───────────────────────────────────────────────────────────

async function seedCategories() {
  console.log('\n[Categories & SubCategories]')
  const categoryMap = {}

  for (const cat of CATEGORIES) {
    let category = await prisma.category.findFirst({ where: { name: cat.name } })

    if (!category) {
      category = await prisma.category.create({ data: { name: cat.name, icon: cat.icon, isInternal: cat.isInternal } })
      ok(`Created category: ${cat.name}${cat.isInternal ? ' (internal)' : ''}`)
    } else {
      if (category.isInternal !== cat.isInternal) {
        category = await prisma.category.update({ where: { id: category.id }, data: { isInternal: cat.isInternal } })
      }
      skip(`Category already exists: ${cat.name}`)
    }
    categoryMap[cat.name] = { id: category.id, subCategories: {} }

    for (const subName of cat.subCategories) {
      let sub = await prisma.subCategory.findFirst({ where: { name: subName, categoryId: category.id } })
      if (!sub) {
        sub = await prisma.subCategory.create({ data: { name: subName, categoryId: category.id } })
        ok(`  Created subcategory: ${subName}`)
      } else {
        skip(`  SubCategory already exists: ${subName}`)
      }
      categoryMap[cat.name].subCategories[subName] = sub.id
    }
  }
  return categoryMap
}

async function seedAdmin() {
  console.log('\n[Admin User]')
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_USER.email } })
  if (existing) { skip(`Admin already exists: ${ADMIN_USER.email}`); return }

  const passwordHash = await bcrypt.hash(ADMIN_USER.password, 10)
  await prisma.user.create({
    data: { email: ADMIN_USER.email, passwordHash, role: ADMIN_USER.role },
  })
  ok(`Created admin: ${ADMIN_USER.email}`)
}

async function seedShops() {
  console.log('\n[Demo Shops]')
  const sellerProfiles = []

  for (const shop of SHOPS) {
    let user = await prisma.user.findUnique({ where: { email: shop.email } })
    if (user) {
      skip(`Shop already exists: ${shop.email}`)
    } else {
      const passwordHash = await bcrypt.hash(shop.password, 10)
      user = await prisma.user.create({
        data: {
          email:        shop.email,
          passwordHash,
          role:         shop.role,
          city:         shop.city,
          sellerProfile: {
            create: {
              businessName:      shop.businessName,
              descriptionAr:     shop.descriptionAr,
              whatsappNumber:    shop.whatsappNumber,
              whatsappVerified:  true, // demo shops are pre-verified so the seeded store is immediately checkout-testable
              city:              shop.city,
              area:              shop.area,
              approvedByAdmin:   true,
              deliveryAvailable: true,
            },
          },
        },
      })
      ok(`Created shop: ${shop.businessName} (${shop.email})`)
    }
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } })
    sellerProfiles.push(profile)
  }
  return sellerProfiles
}

async function seedProducts(sellerProfiles, categoryMap) {
  console.log('\n[Demo Products]')

  for (const p of PRODUCTS) {
    const sellerProfile = sellerProfiles[p.shop]
    const category      = categoryMap[p.category]
    if (!sellerProfile || !category) {
      console.error(`  ERROR: missing shop or category for product "${p.name}" — skipping.`)
      continue
    }
    const subCategoryId = p.subCategory ? (category.subCategories[p.subCategory] ?? null) : null

    const existing = await prisma.product.findFirst({
      where: { name: p.name, sellerId: sellerProfile.id },
    })
    if (existing) { skip(`Product already exists: ${p.name}`); continue }

    const created = await prisma.product.create({
      data: {
        sellerId:       sellerProfile.id,
        categoryId:     category.id,
        subCategoryId,
        brand:          p.brand,
        name:           p.name,
        description:    p.description,
        unitType:       p.unitType ?? null,
        sellByWeight:   p.sellByWeight ?? false,
        originRegion:   p.originRegion ?? null,
        isPerishable:   p.isPerishable ?? false,
        shelfLifeDays:  p.shelfLifeDays ?? null,
        storage:        p.storage ?? null,
        isHeritageGood: p.isHeritageGood ?? false,
        variants: {
          create: p.variants.map(v => ({
            label:    v.label,
            price:    v.price,
            stockQty: v.stockQty,
            skuCode:  v.skuCode,
          })),
        },
      },
      include: { variants: true },
    })
    ok(`Created product: ${created.name} (${created.variants.length} variant${created.variants.length !== 1 ? 's' : ''})`)
  }
}

async function seedZones() {
  console.log('\n[Delivery Zones]')
  const zoneMap = {}

  for (const z of ZONES) {
    let zone = await prisma.deliveryZone.findFirst({ where: { nameEn: z.nameEn } })
    if (!zone) {
      zone = await prisma.deliveryZone.create({
        data: { nameEn: z.nameEn, nameAr: z.nameAr, districts: z.districts, baseFee: z.baseFee, etaMinutes: z.etaMinutes },
      })
      ok(`Created zone: ${z.nameEn}`)
    } else {
      skip(`Zone already exists: ${z.nameEn}`)
    }
    zoneMap[z.nameEn] = zone.id
  }
  return zoneMap
}

async function seedZoneCoverage(sellerProfiles, zoneMap) {
  console.log('\n[Shop Zone Coverage]')

  for (const c of ZONE_COVERAGE) {
    const sellerProfile = sellerProfiles[c.shop]
    const zoneId         = zoneMap[c.zone]
    if (!sellerProfile || !zoneId) {
      console.error(`  ERROR: missing shop or zone for coverage entry (shop ${c.shop}, zone ${c.zone}) — skipping.`)
      continue
    }

    const existing = await prisma.shopZoneCoverage.findUnique({
      where: { sellerId_zoneId: { sellerId: sellerProfile.id, zoneId } },
    })
    if (existing) { skip(`Coverage already exists: shop ${sellerProfile.businessName} × ${c.zone}`); continue }

    await prisma.shopZoneCoverage.create({
      data: {
        sellerId:      sellerProfile.id,
        zoneId,
        cutoffTime:    c.cutoffTime ?? null,
        minOrderValue: c.minOrderValue ?? 0,
        feeOverride:   c.feeOverride ?? null,
      },
    })
    ok(`Coverage: ${sellerProfile.businessName} → ${c.zone}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding Wasla database...')

  const categoryMap    = await seedCategories()
  await seedAdmin()
  const sellerProfiles = await seedShops()
  await seedProducts(sellerProfiles, categoryMap)
  const zoneMap        = await seedZones()
  await seedZoneCoverage(sellerProfiles, zoneMap)

  console.log('\nDone.\n')
}

main()
  .catch(err => {
    console.error('\nSeed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
