// Runs automatically before `npm run dev` (see package.json "predev").
// Prints which DB endpoint the local app is about to talk to, and
// hard-refuses to start if it's the known production database — the
// 2026-08-02 incident (an agent passed the production DATABASE_URL as a
// --shadow-database-url, which Prisma treats as disposable, wiping every
// table) happened because nothing caught "local dev is pointed at prod"
// before a destructive command ran. See CLAUDE.md for the full rule.
import 'dotenv/config'

const PRODUCTION_DB_HOST = 'ep-silent-frost-axbvo9ct-pooler.c-4.us-east-2.aws.neon.tech'

const url = process.env.DATABASE_URL ?? ''
const host = url.match(/@([^/]+)\//)?.[1] ?? '(unparseable DATABASE_URL)'

console.log(`[check-env] DATABASE_URL host: ${host}`)

if (host === PRODUCTION_DB_HOST) {
  console.error(
    '\n[check-env] REFUSING TO START.\n' +
    `DATABASE_URL points at the production database (${PRODUCTION_DB_HOST}).\n` +
    'Local dev must run against a Neon DEV branch, never production.\n' +
    'Fix your .env / .env.local, then re-run `npm run dev`.\n'
  )
  process.exit(1)
}
