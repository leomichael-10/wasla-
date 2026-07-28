# DECISIONS.md

Log of ambiguous calls made during autonomous Phase 2–8 execution, per user instruction to decide/log/keep moving rather than block on approval.

---

**Deferred the `SellerProfile` → `Shop` Prisma model/field rename.** The original brief calls for renaming Vendor/Retailer → Shop at the schema level. Doing that correctly requires updating every `prisma.sellerProfile.*` call, every `sellerId`/`seller:` relation reference, and every import across ~50+ application files (API routes, dashboard pages, components) — a large blast-radius change I can't fully verify at runtime in this JS (non-TypeScript) codebase, since Prisma field renames don't surface as build-time type errors here, only as runtime crashes on first use. Given continuous unattended execution with no human review between phases, I chose not to gamble the whole app on an unverified mechanical rename. UI-facing copy already says "Shop"/"shop" everywhere from Phase 1; the underlying Prisma model stays `SellerProfile`/`sellerId` for now. Flagging as a fast-follow for a dedicated, reviewed pass — not something to redo blind in Phase 8 cleanup.

**Renamed currency-suffixed fields now, in the same Phase 2 migration.** `priceAed`→`price`, `totalAed`→`total`, `commissionAed`→`commission`, `budgetAed`→`budget`, added a `currency` field (default `"EGP"`) to `Order`. This is a pure field rename (not a relation/model rename), so the blast radius is a literal find-and-replace across the codebase — much lower risk than the Shop rename, and this exact call was already made explicitly by the user earlier in this session.

---
