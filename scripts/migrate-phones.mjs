import 'dotenv/config'
import { prisma } from '../lib/prisma.js'
import { toE164 } from '../lib/phone.js'

// Idempotent, dry-run-by-default migration of non-E.164 phone numbers to
// canonical E.164, using the same toE164() every form already writes
// through. Never guesses: a row whose stored value doesn't parse to a
// confident E.164 result is left untouched and reported separately.
//
// Usage:
//   node scripts/migrate-phones.mjs          (dry run — reports only)
//   node scripts/migrate-phones.mjs --apply  (writes the changes)

const APPLY = process.argv.includes('--apply')

async function planField(model, field, where = {}) {
  const rows = await prisma[model].findMany({
    where: { [field]: { not: null }, ...where },
    select: { id: true, [field]: true },
  })

  const toMigrate = []
  const alreadyOk = []
  const unresolved = []

  for (const row of rows) {
    const raw = row[field]
    if (!raw) continue
    const normalized = toE164(raw)
    if (normalized === raw) {
      alreadyOk.push({ id: row.id, value: raw })
    } else if (normalized) {
      toMigrate.push({ id: row.id, before: raw, after: normalized })
    } else {
      unresolved.push({ id: row.id, value: raw })
    }
  }

  return { model, field, toMigrate, alreadyOk, unresolved }
}

function printPlan(plan) {
  const { model, field, toMigrate, alreadyOk, unresolved } = plan
  console.log(`\n=== ${model}.${field} ===`)
  console.log(`already E.164: ${alreadyOk.length} | to migrate: ${toMigrate.length} | left alone (unresolved): ${unresolved.length}`)

  if (toMigrate.length) {
    console.log('\n-- WILL UPDATE --')
    for (const { id, before, after } of toMigrate) {
      console.log(`  id=${id}  "${before}"  ->  "${after}"`)
    }
  }
  if (unresolved.length) {
    console.log('\n-- LEFT ALONE (could not confidently normalize) --')
    for (const { id, value } of unresolved) {
      console.log(`  id=${id}  "${value}"`)
    }
  }
}

async function applyPlan(plan) {
  const { model, field, toMigrate } = plan
  for (const { id, before, after } of toMigrate) {
    // Re-check immediately before writing — idempotent even if the row
    // changed between the plan and apply phases (e.g. re-run after a
    // partial failure, or someone edited it via the app in between).
    const current = await prisma[model].findUnique({ where: { id }, select: { [field]: true } })
    if (!current || current[field] !== before) {
      console.log(`  SKIP id=${id} — value changed since planning (was "${before}", now "${current?.[field]}")`)
      continue
    }
    await prisma[model].update({ where: { id }, data: { [field]: after } })
    console.log(`  UPDATED id=${id} -> "${after}"`)
  }
}

async function main() {
  const plans = [
    await planField('user', 'phone'),
    await planField('sellerProfile', 'whatsappNumber'),
  ]

  plans.forEach(printPlan)

  const totalToMigrate = plans.reduce((n, p) => n + p.toMigrate.length, 0)
  const totalUnresolved = plans.reduce((n, p) => n + p.unresolved.length, 0)

  console.log(`\n${'='.repeat(50)}`)
  console.log(`TOTAL: ${totalToMigrate} row(s) to migrate, ${totalUnresolved} left alone.`)

  if (!APPLY) {
    console.log('\nDRY RUN ONLY — no writes made. Re-run with --apply to write these changes.')
    return
  }

  console.log('\nAPPLYING...')
  for (const plan of plans) {
    if (plan.toMigrate.length) {
      console.log(`\n-- ${plan.model}.${plan.field} --`)
      await applyPlan(plan)
    }
  }
  console.log('\nDone.')
}

main()
  .catch(err => { console.error('FAILED:', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
