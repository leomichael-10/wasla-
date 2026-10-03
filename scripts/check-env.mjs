// Runs before `npm run dev` (package.json "predev") and judges the database
// the app will actually use. It refuses to start if that is production.
//
// Production is the Neon endpoint ep-wild-cloud-ax3xihv9 (see CLAUDE.md). The
// match is on the endpoint id, so the pooled and direct hostnames are both
// caught. Local dev must use the Neon DEV branch.
//
// Deliberately NOT run before `npm run build`: Vercel builds with production's
// DATABASE_URL in its environment, so a guard there would block every deploy.
// The build never touches the database anyway.
import { config } from 'dotenv'

// Next.js precedence: real environment > .env.local > .env. dotenv never
// overrides a variable that is already set, so loading in this order gives
// the same answer the app will see.
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

const PRODUCTION_ENDPOINT_ID = 'ep-wild-cloud-ax3xihv9'

function refuse(reason) {
  console.error(
    '\n[check-env] REFUSING TO START.\n' +
    reason + '\n' +
    'Local dev must run against the Neon DEV branch, never production.\n' +
    'Fix DATABASE_URL in .env.local, then re-run `npm run dev`.\n'
  )
  process.exit(1)
}

const url = process.env.DATABASE_URL ?? ''
if (!url) refuse('DATABASE_URL is not set.')

let host
try {
  host = new URL(url).hostname.toLowerCase()
} catch {
  refuse('DATABASE_URL could not be parsed as a URL.')
}
if (!host) refuse('DATABASE_URL has no host.')

console.log(`[check-env] DATABASE_URL host: ${host}`)

if (host.startsWith(PRODUCTION_ENDPOINT_ID)) {
  refuse(`DATABASE_URL points at the PRODUCTION database (${host}).`)
}
