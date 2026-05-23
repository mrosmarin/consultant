# Active Context

_Last updated: 2026-05-23_

## Current focus

Project bootstrap. Hydrated all scaffold docs (`CLAUDE.md`, `CONTRIBUTING.md`, `DEPLOYMENT-ENV.md`, `WORKTREES.md`, `README.md`, `Makefile`, `scripts/worktree-new.sh`, `.worktreeinclude`) with EndlessWorlds project specifics and initialized this memory bank.

## Recent changes

- Resolved all template placeholder tokens from the bootstrap interview.
- Locked stack: Next.js + pnpm + Turborepo, Supabase (local CLI), Tailwind v4 + shadcn/ui, Vercel, Vitest + Playwright.
- Branching: `feature/dev-XXX-*` → `develop` → `main`; private repo, no branch protection, solo (no required approvals).
- Added per-worktree dev-port assignment to `worktree-new.sh` and a shared-Supabase-stack convention.
- Documented the GitHub Actions quota kill-switch (`RUN_CI` repo variable) — Actions over quota until ~June 2026.

## Project scope (per Linear — source of truth)

Two workstreams across 6 milestones (target 2026-08-31, priority Urgent): **Public marketing site** (M2/M3) + **authenticated secure portal** with timesheets, invoicing, project showcase (M4/M5). Domain: `endlessworlds.xyz`. See [projectbrief](projectbrief.md) for the milestone table.

## Next steps — M1: Foundation & Planning (target 2026-06-06)

> All work below goes in a worktree feature branch (`make worktree-new TICKET=… SLUG=…`) → PR to `develop`. The bootstrap itself was the one-time exception, seeded directly onto `develop`.

1. **Create the `develop` branch** off `main` and push it (base for all feature work — done as part of bootstrap).
2. **Scaffold `apps/web`** (Next.js App Router + TS) and wire Turborepo (`turbo.json`, root `package.json`, `pnpm-workspace.yaml`). First `DEV` ticket.
3. **Set up Supabase** (`supabase init`, local stack, `apps/web/.env.example`).
4. **Tailwind v4 + shadcn/ui** install + dark mode (tailwind-theme-builder skill).
5. **Add the GitHub Actions workflow** gated on `RUN_CI`.
6. **Vercel** project + Git integration; create staging/prod Supabase projects.
7. **Brand guidelines, IA, wireframes** — confirm direction with the user.

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
