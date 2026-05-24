# Active Context

_Last updated: 2026-05-24_

## Current focus

**DEV-84 — scaffold `apps/web` + Turborepo monorepo** (in a worktree off `develop`). The pnpm + Turborepo monorepo and the Next.js app are stood up and verified.

## Recent changes

- **DEV-84:** Created the pnpm + Turborepo monorepo (root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, prettier, `.nvmrc`) and scaffolded `apps/web` via `create-next-app` — **Next.js 16.2.6 + React 19.2.4**, App Router, TS, ESLint, `src/`, `@/*` alias, **no Tailwind yet** (that's DEV-86). Added `check-types` script and `apps/web/.env.example`. Allowed native builds (`sharp`, `unrs-resolver`) at the workspace root; removed the stray `apps/web/pnpm-workspace.yaml`. Fixed a `cp` bug in `worktree-new.sh` (non-glob entries like `.env.local` now skipped if absent). Verified: `pnpm install`, `check-types`, `lint`, `build` (clean), and dev server on port 3084 → HTTP 200.
- **Bootstrap (DEV-83):** Hydrated all scaffold docs; locked stack (Next.js + pnpm + Turborepo, Supabase local CLI, Tailwind v4 + shadcn/ui, Vercel, Vitest + Playwright); branching `feature/dev-XXX-*` → `develop` → `main` (private repo, no protection, solo); per-worktree dev-port + shared-Supabase convention; `RUN_CI` Actions-quota kill-switch (over quota until ~June 2026).

> Note: `apps/web/CLAUDE.md`/`AGENTS.md` (from create-next-app) warn that **Next.js 16 has breaking changes vs. older docs** — consult `node_modules/next/dist/docs/` before writing Next.js code.

## Project scope (per Linear — source of truth)

Two workstreams across 6 milestones (target 2026-08-31, priority Urgent): **Public marketing site** (M2/M3) + **authenticated secure portal** with timesheets, invoicing, project showcase (M4/M5). Domain: `endlessworlds.xyz`. See [projectbrief](projectbrief.md) for the milestone table.

## Next steps — M1: Foundation & Planning (target 2026-06-06)

> All work below goes in a worktree feature branch (`make worktree-new TICKET=… SLUG=…`) → PR to `develop`. The bootstrap itself was the one-time exception, seeded directly onto `develop`.

1. ~~Create `develop`~~ ✅ (bootstrap). ~~Scaffold `apps/web` + Turborepo~~ ✅ (DEV-84, in PR).
2. **DEV-85 — Set up Supabase** (`supabase init`, local stack, wire `.env.local`, `@supabase/ssr`).
3. **DEV-86 — Tailwind v4 + shadcn/ui** install + dark mode (tailwind-theme-builder skill).
4. **DEV-87 — GitHub Actions workflow** gated on `RUN_CI`.
5. **DEV-88 — Vercel** project + Git integration; create staging/prod Supabase projects.
6. **DEV-89 — Brand guidelines, IA, wireframes** — confirm direction with the user.

## Open questions / decisions pending

- Exact public page set and brand/visual direction (TBD with user).
- Portal: auth provider (Supabase Auth fits the OAuth/JWT requirement) and RBAC role model.
- Whether **payments** (Stripe) are in MVP scope for invoicing.
- Cloud Supabase project refs for staging/prod still to be created.
- Whether a `packages/*` shared layer is needed yet (default: no, until a second consumer exists — likely once portal + public site share UI).

## Important preferences

- Never commit/push without explicit user approval; show staged files + message first.
- Pre-commit hygiene order: memory bank → docs → Linear ticket comment → commit.
- Monorepo is preferred even for a single app.
