# Active Context

_Last updated: 2026-05-24_

## Current focus

**DEV-85 — adopt the Neon stack** (Neon serverless Postgres + Neon Auth + Drizzle ORM), replacing Supabase. Docs + Drizzle scaffold land first; Neon Auth wiring + cloud provisioning follow (need Neon credentials).

## Recent changes

- **DEV-85 (stack switch):** Decided **Neon over Supabase** (2026-05-24). Neon Auth (Beta, built on Better Auth, RLS-compatible `neon_auth` schema) removes the "DB-only" downside. Swapped all docs/memory-bank to Neon; added Drizzle (`drizzle-orm` + `@neondatabase/serverless` + `drizzle-kit`) with `drizzle.config.ts` + `apps/web/src/db`; rewrote `apps/web/.env.example` (`DATABASE_URL`/`DATABASE_URL_UNPOOLED`, Neon Auth vars); Makefile db targets → Drizzle. Build/lint/types verified.
- **DEV-84:** Created the pnpm + Turborepo monorepo (root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, prettier, `.nvmrc`) and scaffolded `apps/web` via `create-next-app` — **Next.js 16.2.6 + React 19.2.4**, App Router, TS, ESLint, `src/`, `@/*` alias, **no Tailwind yet** (that's DEV-86). Added `check-types` script and `apps/web/.env.example`. Allowed native builds (`sharp`, `unrs-resolver`) at the workspace root; removed the stray `apps/web/pnpm-workspace.yaml`. Fixed a `cp` bug in `worktree-new.sh` (non-glob entries like `.env.local` now skipped if absent). Verified: `pnpm install`, `check-types`, `lint`, `build` (clean), and dev server on port 3084 → HTTP 200.
- **Bootstrap (DEV-83):** Hydrated all scaffold docs; locked stack (Next.js + pnpm + Turborepo, Supabase local CLI, Tailwind v4 + shadcn/ui, Vercel, Vitest + Playwright); branching `feature/dev-XXX-*` → `develop` → `main` (private repo, no protection, solo); per-worktree dev-port + shared-Supabase convention; `RUN_CI` Actions-quota kill-switch (over quota until ~June 2026).

> Note: `apps/web/CLAUDE.md`/`AGENTS.md` (from create-next-app) warn that **Next.js 16 has breaking changes vs. older docs** — consult `node_modules/next/dist/docs/` before writing Next.js code.

## Project scope (per Linear — source of truth)

Two workstreams across 6 milestones (target 2026-08-31, priority Urgent): **Public marketing site** (M2/M3) + **authenticated secure portal** with timesheets, invoicing, project showcase (M4/M5). Domain: `endlessworlds.xyz`. See [projectbrief](projectbrief.md) for the milestone table.

## Next steps — M1: Foundation & Planning (target 2026-06-06)

> All work below goes in a worktree feature branch (`make worktree-new TICKET=… SLUG=…`) → PR to `develop`. The bootstrap itself was the one-time exception, seeded directly onto `develop`.

1. ~~Create `develop`~~ ✅. ~~Scaffold `apps/web` + Turborepo~~ ✅ (DEV-84, merged).
2. **DEV-85 — adopt Neon stack** (in progress): docs + Drizzle scaffold (this PR); then Neon Auth wiring + provision Neon (needs credentials).
3. **DEV-86 — Tailwind v4 + shadcn/ui** install + dark mode (tailwind-theme-builder skill).
4. **DEV-87 — GitHub Actions workflow** gated on `RUN_CI`.
5. **DEV-88 — Vercel** + Git integration; provision Neon project/branches (dev/staging/prod).
6. **DEV-89 — Brand guidelines, IA, wireframes** — confirm direction with the user.

## Open questions / decisions pending

- Exact public page set and brand/visual direction (TBD with user).
- Portal RBAC role model — confirm Neon Auth / Better Auth org & access-control plugins cover it.
- Neon Auth is **Beta** + AWS-only — acceptable for MVP? Fallback: Better Auth self-hosted directly on Neon.
- Whether **payments** (Stripe) are in MVP scope for invoicing.
- Need a **Neon account/API key** (or the Vercel↔Neon integration) to provision dev/staging/prod branches — not yet available to me.
- Local dev DB: shared Neon dev branch vs per-worktree branch.
- Whether a `packages/*` shared layer is needed yet (default: no, until a second consumer exists — likely once portal + public site share UI).

## Important preferences

- Never commit/push without explicit user approval; show staged files + message first.
- Pre-commit hygiene order: memory bank → docs → Linear ticket comment → commit.
- Monorepo is preferred even for a single app.
