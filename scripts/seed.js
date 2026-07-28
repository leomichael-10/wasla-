import 'dotenv/config'
import { prisma } from '../lib/prisma.js'
import bcrypt from 'bcryptjs'

// All demo product SKUs are prefixed DEMO- so they can be found and wiped in
// one query once real shop data replaces them:
//   prisma.productVariant.deleteMany({ where: { skuCode: { startsWith: 'DEMO-' } } })
// then prisma.product.deleteMany({ where: { variants: { none: {} } } })

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
  email:    'admin@wasla.com',
  password: 'admin1234',
  role:     'admin',
}

// ─── Demo shops (3, per Phase 3 brief) ────────────────────────────────────────

const SHOPS = [
  {
    email:        'seller@wasla.com',
    password:     'seller1234',
    role:         'retailer',
    city:         'Cairo',
    area:         'Faisal',
    businessName: 'Kassala Coffee House',
  },
  {
    email:        'seller2@wasla.com',
    password:     'seller2024',
    role:         'retailer',
    city:         'Giza',
    area:         'Ard El Lewa',
    businessName: 'Ard El Lewa Sudanese Market',
  },
  {
    email:        'seller3@wasla.com',
    password:     'seller3024',
    role:         'retailer',
    city:         'Cairo',
    area:         'Nasr City',
    businessName: 'Bayt Al Sudan Heritage Store',
  },
]

// ─── Demo products (~25 across all categories, EGP pricing) ─────────────────
// shop: index into SHOPS. category/subCategory: looked up by name at seed time.

const PRODUCTS = [
  // Kassala Coffee House (shop 0) — coffee, tea, spices
  { shop: 0, category: 'Coffee & Jabana', subCategory: 'Coffee Beans', name: 'Bun Kassala', brand: 'Kassala',
    description: 'Traditional Sudanese roasted coffee beans from Kassala.', unitType: 'GRAM', sellByWeight: true, originRegion: 'Kassala', isPerishable: false, storage: 'AMBIENT',
    variants: [
      { label: '250g', price: 180, stockQty: 40, skuCode: 'DEMO-BUN-KSL-250' },
      { label: '500g', price: 340, stockQty: 30, skuCode: 'DEMO-BUN-KSL-500' },
      { label: '1kg',  price: 640, stockQty: 15, skuCode: 'DEMO-BUN-KSL-1000' },
    ] },
  { shop: 0, category: 'Coffee & Jabana', subCategory: 'Jabana Sets', name: 'Traditional Jabana Coffee Set', brand: 'Kassala',
    description: 'Clay jabana pot with cups for Sudanese coffee ceremony.', unitType: 'PIECE', isHeritageGood: true, storage: 'AMBIENT',
    variants: [ { label: 'Standard', price: 450, stockQty: 12, skuCode: 'DEMO-JABANA-SET-STD' } ] },
  { shop: 0, category: 'Tea & Drinks', subCategory: 'Karkade', name: 'Karkade (Dried Hibiscus)', brand: 'Kassala',
    description: 'Dried hibiscus flowers for Sudanese karkade tea.', unitType: 'GRAM', sellByWeight: true, isPerishable: false, storage: 'AMBIENT',
    variants: [
      { label: '250g', price: 90, stockQty: 50, skuCode: 'DEMO-KARKADE-250' },
      { label: '500g', price: 170, stockQty: 25, skuCode: 'DEMO-KARKADE-500' },
    ] },
  { shop: 0, category: 'Tea & Drinks', subCategory: 'Aradaib & Tabaldi', name: 'Aradaib (Tamarind Pods)', brand: 'Kassala',
    description: 'Tamarind pods for aradaib drink.', unitType: 'GRAM', sellByWeight: true, isPerishable: true, shelfLifeDays: 180, storage: 'AMBIENT',
    variants: [ { label: '400g', price: 110, stockQty: 30, skuCode: 'DEMO-ARADAIB-400' } ] },
  { shop: 0, category: 'Tea & Drinks', subCategory: 'Gongolez', name: 'Gongolez (Baobab Powder)', brand: 'Kassala',
    description: 'Ground baobab fruit powder, used for gongolez drink.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '300g', price: 130, stockQty: 20, skuCode: 'DEMO-GONGOLEZ-300' } ] },
  { shop: 0, category: 'Spices & Seasonings', subCategory: 'Shatta', name: 'Shatta (Sudanese Chili Paste)', brand: 'Kassala',
    description: 'Spicy fermented chili condiment.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 60, storage: 'CHILLED',
    variants: [ { label: '200g Jar', price: 75, stockQty: 35, skuCode: 'DEMO-SHATTA-200' } ] },
  { shop: 0, category: 'Spices & Seasonings', subCategory: 'Kombo', name: 'Kombo Spice Mix', brand: 'Kassala',
    description: 'Traditional ground spice blend for stews.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '150g', price: 65, stockQty: 40, skuCode: 'DEMO-KOMBO-150' } ] },
  { shop: 0, category: 'Spices & Seasonings', subCategory: 'Sumbula', name: 'Sumbula (Nigella Seed Blend)', brand: 'Kassala',
    description: 'Aromatic seed spice blend.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '100g', price: 55, stockQty: 45, skuCode: 'DEMO-SUMBULA-100' } ] },
  { shop: 0, category: 'Oils & Ghee', subCategory: 'Sirij (Sesame Oil)', name: 'Sirij Sesame Oil', brand: 'Kassala',
    description: 'Cold-pressed sesame oil.', unitType: 'MILLILITER', isPerishable: true, shelfLifeDays: 365, storage: 'AMBIENT',
    variants: [
      { label: '500ml', price: 210, stockQty: 20, skuCode: 'DEMO-SIRIJ-500' },
      { label: '1L',    price: 390, stockQty: 12, skuCode: 'DEMO-SIRIJ-1000' },
    ] },

  // Ard El Lewa Sudanese Market (shop 1) — grains, dakwa, dried goods, sweets
  { shop: 1, category: 'Grains & Flour', subCategory: 'Dura', name: 'Dura (Sudanese Sorghum)', brand: 'Ard El Lewa',
    description: 'Whole sorghum grain, staple Sudanese cereal.', unitType: 'KILOGRAM', sellByWeight: true, originRegion: 'Gedaref', storage: 'AMBIENT',
    variants: [
      { label: '1kg', price: 60, stockQty: 60, skuCode: 'DEMO-DURA-1000' },
      { label: '5kg', price: 280, stockQty: 20, skuCode: 'DEMO-DURA-5000' },
    ] },
  { shop: 1, category: 'Grains & Flour', subCategory: 'Kisra Flour', name: 'Kisra Flour', brand: 'Ard El Lewa',
    description: 'Fermented sorghum flour for making kisra bread.', unitType: 'KILOGRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '1kg', price: 75, stockQty: 35, skuCode: 'DEMO-KISRA-1000' } ] },
  { shop: 1, category: 'Grains & Flour', subCategory: 'Aseeda', name: 'Aseeda Flour Mix', brand: 'Ard El Lewa',
    description: 'Ready flour mix for aseeda porridge.', unitType: 'KILOGRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '1kg', price: 70, stockQty: 25, skuCode: 'DEMO-ASEEDA-1000' } ] },
  { shop: 1, category: 'Dakwa & Peanut Products', subCategory: 'Dakwa', name: 'Dakwa (Peanut Butter Spread)', brand: 'Ard El Lewa',
    description: 'Traditional Sudanese roasted peanut spread.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 120, storage: 'AMBIENT',
    variants: [
      { label: '250g Jar', price: 95, stockQty: 30, skuCode: 'DEMO-DAKWA-250' },
      { label: '500g Jar', price: 175, stockQty: 18, skuCode: 'DEMO-DAKWA-500' },
    ] },
  { shop: 1, category: 'Dakwa & Peanut Products', subCategory: 'Peanut Products', name: 'Roasted Peanuts (Fol Sudani)', brand: 'Ard El Lewa',
    description: 'Roasted and salted Sudanese peanuts.', unitType: 'GRAM', sellByWeight: true, isPerishable: true, shelfLifeDays: 90, storage: 'AMBIENT',
    variants: [ { label: '400g', price: 85, stockQty: 40, skuCode: 'DEMO-PEANUT-400' } ] },
  { shop: 1, category: 'Weika & Dried Goods', subCategory: 'Weika', name: 'Weika (Dried Okra Powder)', brand: 'Ard El Lewa',
    description: 'Ground dried okra for weika stew.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '200g', price: 80, stockQty: 25, skuCode: 'DEMO-WEIKA-200' } ] },
  { shop: 1, category: 'Weika & Dried Goods', subCategory: 'Dried Vegetables', name: 'Dried Okra Whole (Weika Khadra)', brand: 'Ard El Lewa',
    description: 'Whole sun-dried okra pods.', unitType: 'GRAM', sellByWeight: true, storage: 'AMBIENT',
    variants: [ { label: '150g', price: 60, stockQty: 30, skuCode: 'DEMO-DRIEDOKRA-150' } ] },
  { shop: 1, category: 'Sweets & Snacks', subCategory: 'Tahniya', name: 'Tahniya (Sesame Halva)', brand: 'Ard El Lewa',
    description: 'Sweet sesame paste confection.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 45, storage: 'AMBIENT',
    variants: [ { label: '400g', price: 100, stockQty: 22, skuCode: 'DEMO-TAHNIYA-400' } ] },
  { shop: 1, category: 'Sweets & Snacks', subCategory: 'Sesame Bars', name: 'Sesame Snack Bars', brand: 'Ard El Lewa',
    description: 'Crunchy sesame and honey snack bars.', unitType: 'PIECE', isPerishable: true, shelfLifeDays: 60, storage: 'AMBIENT',
    variants: [ { label: 'Pack of 6', price: 65, stockQty: 40, skuCode: 'DEMO-SESAMEBAR-6PK' } ] },
  { shop: 1, category: 'Oils & Ghee', subCategory: 'Ghee', name: 'Sudanese Ghee (Samn)', brand: 'Ard El Lewa',
    description: 'Clarified butter, traditional Sudanese ghee.', unitType: 'GRAM', isPerishable: true, shelfLifeDays: 270, storage: 'AMBIENT',
    variants: [
      { label: '500g Jar', price: 260, stockQty: 15, skuCode: 'DEMO-GHEE-500' },
      { label: '1kg Jar',  price: 490, stockQty: 8,  skuCode: 'DEMO-GHEE-1000' },
    ] },

  // Bayt Al Sudan Heritage Store (shop 2) — bakhour, clothing, homeware
  { shop: 2, category: 'Bakhour & Perfumes', subCategory: 'Khumra', name: 'Khumra Bakhour Blend', brand: 'Bayt Al Sudan',
    description: 'Traditional Sudanese scented wood incense blend.', unitType: 'GRAM', storage: 'AMBIENT',
    variants: [ { label: '100g', price: 220, stockQty: 20, skuCode: 'DEMO-KHUMRA-100' } ] },
  { shop: 2, category: 'Bakhour & Perfumes', subCategory: 'Dilka', name: 'Dilka Perfumed Body Scrub', brand: 'Bayt Al Sudan',
    description: 'Traditional fragrant body scrub paste.', unitType: 'GRAM', storage: 'AMBIENT',
    variants: [ { label: '150g', price: 140, stockQty: 18, skuCode: 'DEMO-DILKA-150' } ] },
  { shop: 2, category: 'Bakhour & Perfumes', subCategory: 'Sandalia', name: 'Sandalia Sandalwood Perfume Oil', brand: 'Bayt Al Sudan',
    description: 'Concentrated sandalwood perfume oil.', unitType: 'MILLILITER', storage: 'AMBIENT',
    variants: [ { label: '30ml', price: 180, stockQty: 15, skuCode: 'DEMO-SANDALIA-30' } ] },
  { shop: 2, category: 'Heritage Clothing', subCategory: 'Thobe', name: "Men's Sudanese Thobe", brand: 'Bayt Al Sudan',
    description: 'Traditional white cotton thobe.', unitType: 'PIECE', isHeritageGood: true, storage: 'AMBIENT',
    variants: [
      { label: 'M', price: 650, stockQty: 10, skuCode: 'DEMO-THOBE-M' },
      { label: 'L', price: 650, stockQty: 12, skuCode: 'DEMO-THOBE-L' },
      { label: 'XL', price: 690, stockQty: 8, skuCode: 'DEMO-THOBE-XL' },
    ] },
  { shop: 2, category: 'Heritage Clothing', subCategory: 'Taqiya', name: 'Embroidered Taqiya Cap', brand: 'Bayt Al Sudan',
    description: 'Hand-embroidered traditional cap.', unitType: 'PIECE', isHeritageGood: true, storage: 'AMBIENT',
    variants: [ { label: 'Standard', price: 180, stockQty: 25, skuCode: 'DEMO-TAQIYA-STD' } ] },
  { shop: 2, category: 'Heritage Clothing', subCategory: 'Markoub', name: 'Markoub Leather Sandals', brand: 'Bayt Al Sudan',
    description: 'Handmade leather Sudanese sandals.', unitType: 'PIECE', isHeritageGood: true, storage: 'AMBIENT',
    variants: [
      { label: '42', price: 320, stockQty: 10, skuCode: 'DEMO-MARKOUB-42' },
      { label: '44', price: 320, stockQty: 10, skuCode: 'DEMO-MARKOUB-44' },
    ] },
  { shop: 2, category: 'Homeware & Handicrafts', subCategory: 'Jabana Sets', name: 'Handcrafted Jabana Coffee Pot', brand: 'Bayt Al Sudan',
    description: 'Hand-shaped clay jabana pot, artisan made.', unitType: 'PIECE', isHeritageGood: true, storage: 'AMBIENT',
    variants: [ { label: 'Large', price: 380, stockQty: 9, skuCode: 'DEMO-JABANAPOT-LG' } ] },
  { shop: 2, category: 'Homeware & Handicrafts', subCategory: 'Birish', name: 'Birish Woven Prayer Mat', brand: 'Bayt Al Sudan',
    description: 'Traditional hand-woven palm-leaf mat.', unitType: 'PIECE', isHeritageGood: true, storage: 'AMBIENT',
    variants: [ { label: 'Standard', price: 260, stockQty: 14, skuCode: 'DEMO-BIRISH-STD' } ] },
]

// ─── Launch delivery zones (Phase 4) ─────────────────────────────────────────
// Highest Sudanese-density areas first, per the brief.

const ZONES = [
  { nameEn: 'Faisal',            nameAr: 'فيصل',           districts: ['Faisal'],            baseFee: 25, etaMinutes: 90 },
  { nameEn: 'Haram',              nameAr: 'الهرم',          districts: ['Haram'],              baseFee: 25, etaMinutes: 90 },
  { nameEn: 'Ard El Lewa',        nameAr: 'أرض اللواء',      districts: ['Ard El Lewa'],        baseFee: 20, etaMinutes: 75 },
  { nameEn: '6th of October (Hosary)', nameAr: 'السادس من أكتوبر (الحصري)', districts: ['Hosary'], baseFee: 35, etaMinutes: 120 },
  { nameEn: 'Nasr City',           nameAr: 'مدينة نصر',       districts: ['Nasr City'],          baseFee: 25, etaMinutes: 90 },
  { nameEn: 'Ain Shams',           nameAr: 'عين شمس',         districts: ['Ain Shams'],          baseFee: 30, etaMinutes: 100 },
  { nameEn: 'Maadi',               nameAr: 'المعادي',         districts: ['Maadi'],              baseFee: 30, etaMinutes: 100 },
  { nameEn: 'Hadayek El Maadi',    nameAr: 'حدائق المعادي',    districts: ['Hadayek El Maadi'],   baseFee: 30, etaMinutes: 100 },
]

// Which demo shops cover which zones (by zone nameEn), with optional overrides.
const ZONE_COVERAGE = [
  { shop: 0, zone: 'Faisal',        cutoffTime: '18:00' },
  { shop: 0, zone: 'Ard El Lewa',   cutoffTime: '18:00' },
  { shop: 0, zone: 'Haram',         cutoffTime: '18:00' },
  { shop: 1, zone: 'Ard El Lewa',   cutoffTime: '17:00', minOrderValue: 100 },
  { shop: 1, zone: 'Haram',         cutoffTime: '17:00', minOrderValue: 100 },
  { shop: 1, zone: 'Faisal',        cutoffTime: '17:00', minOrderValue: 100 },
  { shop: 2, zone: 'Nasr City',     cutoffTime: '19:00' },
  { shop: 2, zone: 'Ain Shams',     cutoffTime: '19:00' },
  { shop: 2, zone: 'Maadi',         cutoffTime: '19:00', feeOverride: 40 },
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
      category = await prisma.category.create({ data: { name: cat.name, icon: cat.icon } })
      ok(`Created category: ${cat.name}`)
    } else {
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
    const subCategoryId = category.subCategories[p.subCategory] ?? null

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
