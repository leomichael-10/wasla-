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
  point at the Neon **DEV branch**, never production. `npm run dev` runs
  `scripts/check-env.mjs` first (via `predev`) and **refuses to start** if
  `DATABASE_URL` is the production endpoint (`ep-wild-cloud-ax3xihv9`,
  pooled or direct). It does not cover `npm run seed` or ad-hoc scripts,
  so check the host yourself before running those.
- Before running any command that can alter or reset schema/data
  (`prisma migrate dev`, `migrate deploy`, `migrate reset`, `db push
  --accept-data-loss`, `migrate diff` with a shadow DB, raw
  `DROP`/`TRUNCATE`/`DELETE` without a `WHERE`), print the DB endpoint
  first and confirm it's the intended one.
- Prefer hand-writing migration SQL + `prisma migrate deploy` over
  `prisma migrate dev` in this environment — `migrate dev`'s interactive
  confirmation prompts don't work here (non-interactive shell), which is
  what pushed the agent toward `migrate diff` in the first place.
- Never put a destructive Prisma command in a build command (e.g. `db push --accept-data-loss`, `migrate reset`); schema changes go through `prisma migrate deploy` by hand.

## Environment files and hosts

- **Production**: Neon endpoint `ep-wild-cloud-ax3xihv9-pooler.c-4.us-east-2.aws.neon.tech`.
  Vercel's Production `DATABASE_URL` points here. Nothing local may write to it.
- **Dev**: the Neon DEV branch. Host: `TBD — record it here once confirmed.`
- `.env` / `.env.local` — local dev, **must** point at the DEV branch, never
  production. Both are gitignored.
- Do not keep a local copy of Vercel's environment variables. `.env.vercel.local`
  was deleted: it recorded a different endpoint as production for weeks.
- Production `DATABASE_URL` lives only in Vercel's project settings and in the
  Neon console — it should not need to be typed into a local terminal at all
  for day-to-day work.
