# Wasla — repo rules

## Database safety (mandatory, added after a data-loss incident)

**On 2026-08-02, an agent ran `prisma migrate diff --shadow-database-url
"<production DATABASE_URL>"`.** Prisma treats the shadow/scratch database
argument as disposable and fully under its control — pointing it at the
real production database wiped every table (`User`, `SellerProfile`,
`Product`, everything — 0 rows left). This was 100% avoidable.

**Rules going forward:**

- **NEVER** pass a real/production `DATABASE_URL` value to
  `--shadow-database-url`, `--url`, or any other flag documented as a
  scratch, shadow, or disposable database. If a command needs a shadow
  database and you don't have a dedicated empty one to point it at,
  don't run that command — ask first.
- Local development (`npm run dev`, `npm run seed`, ad-hoc scripts) must
  point at the Neon **DEV branch**, never the production branch. `npm run
  dev` runs `scripts/check-env.mjs` first (via `predev`), which prints
  the DB host being used and **hard-refuses to start** if it matches the
  known production host.
- Before running any command that can alter or reset schema/data
  (`prisma migrate dev`, `migrate deploy`, `migrate reset`, `db push
  --accept-data-loss`, `migrate diff` with a shadow DB, raw
  `DROP`/`TRUNCATE`/`DELETE` without a `WHERE`), print the DB endpoint
  first and confirm it's the intended one.
- Prefer hand-writing migration SQL + `prisma migrate deploy` over
  `prisma migrate dev` in this environment — `migrate dev`'s interactive
  confirmation prompts don't work here (non-interactive shell), which is
  what pushed the agent toward `migrate diff` in the first place.

## Environment files

- `.env` / `.env.local` — local dev, **must** point at the Neon DEV
  branch.
- `.env.vercel.local` — a local pull of Vercel's env vars; not
  authoritative for local dev.
- Production `DATABASE_URL` lives only in Vercel's project settings and
  in the Neon console — it should not need to be typed into a local
  terminal at all for day-to-day work.
