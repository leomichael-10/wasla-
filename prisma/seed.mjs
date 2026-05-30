/**
 * prisma/seed.mjs
 * Parses TSH_SKU's.xlsx and seeds the Vape, Sparepart, Dokha, and Cigarette tables.
 * Run via: npx prisma db seed
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const prisma = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────────────────────

/** Return a Decimal-safe number or null. "-" and undefined become null. */
function toPrice(val) {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(n) ? null : n;
}

/** Trim a string value; return null for blank/nullish. */
function str(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

// ─── VAPES ─────────────────────────────────────────────────────────────────
// Header: [BRAND, PRODUCT, VAPE CENTER, VGOD, ENERGY VAPE]

async function seedVapes(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  // row 0 is the header; skip it
  const data = rows.slice(1).filter(r => r.length > 0 && (r[0] || r[1]));

  let lastBrand = null;
  const records = [];

  for (const row of data) {
    const brand = str(row[0]) ?? lastBrand;
    if (str(row[0])) lastBrand = str(row[0]);

    const product = str(row[1]);
    if (!brand || !product) continue;

    records.push({
      brand,
      product,
      priceVapeCenter: toPrice(row[2]),
      priceVgod:       toPrice(row[3]),
      priceEnergyVape: toPrice(row[4]),
    });
  }

  console.log(`  Vapes: upserting ${records.length} rows…`);
  for (const rec of records) {
    await prisma.vape.upsert({
      where:  { brand_product: { brand: rec.brand, product: rec.product } },
      create: rec,
      update: {
        priceVapeCenter: rec.priceVapeCenter,
        priceVgod:       rec.priceVgod,
        priceEnergyVape: rec.priceEnergyVape,
      },
    });
  }
}

// ─── SPAREPARTS ────────────────────────────────────────────────────────────
// Header: [BRAND, DEVICE, SPAREPART, VARIANT, VAPE CENTER]

async function seedSpareparts(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data = rows.slice(1).filter(r => r.length > 0 && (r[0] || r[2]));

  let lastBrand  = null;
  let lastDevice = null;
  const records  = [];

  for (const row of data) {
    if (str(row[0])) lastBrand  = str(row[0]);
    if (str(row[1])) lastDevice = str(row[1]);

    const brand     = lastBrand;
    const device    = lastDevice;
    const sparepart = str(row[2]);
    const variant   = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : null;

    if (!brand || !sparepart) continue;

    records.push({
      brand,
      device,
      sparepart,
      variant:        variant === '' ? null : variant,
      priceVapeCenter: toPrice(row[4]),
    });
  }

  console.log(`  Spareparts: upserting ${records.length} rows…`);
  for (const rec of records) {
    await prisma.sparepart.upsert({
      where: {
        brand_sparepart_variant: {
          brand:     rec.brand,
          sparepart: rec.sparepart,
          variant:   rec.variant ?? '',
        },
      },
      create: rec,
      update: {
        device:          rec.device,
        priceVapeCenter: rec.priceVapeCenter,
      },
    });
  }
}

// ─── DOKHA ─────────────────────────────────────────────────────────────────
// Header: [Supplier Name, Variant, Cost Per KG]

async function seedDokha(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data = rows.slice(1).filter(r => r.length > 0 && r[1]);

  let lastSupplier = null;
  const records    = [];

  for (const row of data) {
    if (str(row[0])) lastSupplier = str(row[0]);

    const variant   = str(row[1]);
    const costPerKg = toPrice(row[2]);

    if (!variant || costPerKg === null) continue;

    records.push({ supplier: lastSupplier, variant, costPerKg });
  }

  console.log(`  Dokha: upserting ${records.length} rows…`);
  for (const rec of records) {
    await prisma.dokha.upsert({
      where:  { variant: rec.variant },
      create: rec,
      update: { supplier: rec.supplier, costPerKg: rec.costPerKg },
    });
  }
}

// ─── CIGGS ─────────────────────────────────────────────────────────────────
// No header row. Columns: [name, price?]

async function seedCigarettes(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data = rows.filter(r => r.length > 0 && r[0]);

  const records = data.map(row => ({
    name:  String(row[0]).trim(),
    price: toPrice(row[1]),
  })).filter(r => r.name);

  console.log(`  Cigarettes: upserting ${records.length} rows…`);
  for (const rec of records) {
    await prisma.cigarette.upsert({
      where:  { name: rec.name },
      create: rec,
      update: { price: rec.price },
    });
  }
}

// ─── MASTER PRODUCTS (retailer catalog) ────────────────────────────────────
// Ensures each SKU row is also visible as a MasterProduct so retailers can
// browse and select products from the catalog page.

async function seedMasterProducts(wb) {
  // 1. Upsert the 4 categories we need
  const categoryNames = ['Vapes', 'Spare Parts', 'Dokha', 'Cigarettes'];
  const catMap = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where:  { name },
      create: { name },
      update: {},
    });
    catMap[name] = cat.id;
  }

  const toUpsert = [];

  // ── Vapes ──────────────────────────────────────────────────────────────
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['VAPES'], { header: 1 });
    let lastBrand = null;
    for (const row of rows.slice(1)) {
      if (!row.length || (!row[0] && !row[1])) continue;
      if (str(row[0])) lastBrand = str(row[0]);
      const brand   = lastBrand;
      const product = str(row[1]);
      if (!brand || !product) continue;

      const prices = [toPrice(row[2]), toPrice(row[3]), toPrice(row[4])].filter(p => p !== null);
      const priceMin = prices.length ? Math.min(...prices) : null;
      const priceMax = prices.length ? Math.max(...prices) : null;

      toUpsert.push({
        name:       `${brand} ${product}`,
        brand,
        categoryId: catMap['Vapes'],
        productType: 'vape',
        priceMin:   priceMin !== null ? priceMin : undefined,
        priceMax:   priceMax !== null ? priceMax : undefined,
        isActive:   true,
      });
    }
  }

  // ── Spare Parts ────────────────────────────────────────────────────────
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['SPAREPARTS'], { header: 1 });
    let lastBrand = null; let lastDevice = null;
    for (const row of rows.slice(1)) {
      if (!row.length || (!row[0] && !row[2])) continue;
      if (str(row[0])) lastBrand  = str(row[0]);
      if (str(row[1])) lastDevice = str(row[1]);
      const brand     = lastBrand;
      const sparepart = str(row[2]);
      const variant   = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : null;
      if (!brand || !sparepart) continue;

      const nameParts = [lastDevice, sparepart, variant].filter(Boolean);
      const price = toPrice(row[4]);

      toUpsert.push({
        name:       `${brand} ${nameParts.join(' ')}`,
        brand,
        categoryId: catMap['Spare Parts'],
        productType: 'sparepart',
        priceMin:   price !== null ? price : undefined,
        priceMax:   price !== null ? price : undefined,
        isActive:   true,
      });
    }
  }

  // ── Dokha ──────────────────────────────────────────────────────────────
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['DOKHA'], { header: 1 });
    let lastSupplier = null;
    for (const row of rows.slice(1)) {
      if (!row.length || !row[1]) continue;
      if (str(row[0])) lastSupplier = str(row[0]);
      const variant   = str(row[1]);
      const costPerKg = toPrice(row[2]);
      if (!variant || costPerKg === null) continue;

      toUpsert.push({
        name:       `Dokha ${variant}${lastSupplier ? ` (${lastSupplier})` : ''}`,
        brand:      lastSupplier ?? undefined,
        categoryId: catMap['Dokha'],
        productType: 'dokha',
        priceMin:   costPerKg,
        priceMax:   costPerKg,
        isActive:   true,
      });
    }
  }

  // ── Cigarettes ─────────────────────────────────────────────────────────
  {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['CIGGS'], { header: 1 });
    for (const row of rows) {
      if (!row.length || !row[0]) continue;
      const name  = String(row[0]).trim();
      const price = toPrice(row[1]);

      toUpsert.push({
        name,
        categoryId:  catMap['Cigarettes'],
        productType: 'cigarette',
        priceMin:    price !== null ? price : undefined,
        priceMax:    price !== null ? price : undefined,
        isActive:    true,
      });
    }
  }

  console.log(`  MasterProducts: upserting ${toUpsert.length} rows…`);
  for (const rec of toUpsert) {
    await prisma.masterProduct.upsert({
      where:  { name: rec.name },
      create: rec,
      update: {
        brand:       rec.brand,
        categoryId:  rec.categoryId,
        productType: rec.productType,
        priceMin:    rec.priceMin ?? null,
        priceMax:    rec.priceMax ?? null,
        isActive:    true,
      },
    });
  }
}

// ─── main ──────────────────────────────────────────────────────────────────

async function main() {
  // File lives in the user's OneDrive Desktop, independent of project location
  const filePath = path.join(os.homedir(), 'OneDrive', 'Desktop', "TSH_SKU's.xlsx");

  console.log(`Reading Excel file: ${filePath}`);
  const wb = XLSX.readFile(filePath);

  console.log('Seeding database…');

  await seedVapes(wb.Sheets['VAPES']);
  await seedSpareparts(wb.Sheets['SPAREPARTS']);
  await seedDokha(wb.Sheets['DOKHA']);
  await seedCigarettes(wb.Sheets['CIGGS']);
  await seedMasterProducts(wb);

  console.log('✅ Seed complete.');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
