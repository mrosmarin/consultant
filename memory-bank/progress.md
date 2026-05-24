# Progress

_Last updated: 2026-05-24_

## What works

- Devcontainer (Docker-in-Docker) with pnpm, turbo, gh, commitizen-go, Go, Claude/Kilo CLIs.
- Agentic tooling checked in: skills (`.agents/skills/`, pinned in `skills-lock.json`) + MCP servers (`.mcp.json`). Tokens present in `.devcontainer/.env`.
- Project docs hydrated and consistent: `CLAUDE.md`, `CONTRIBUTING.md`, `DEPLOYMENT-ENV.md`, `WORKTREES.md`, `README.md`, `Makefile`, `scripts/worktree-new.sh`, `.worktreeinclude`.
- Memory bank initialized (this directory).
- Worktree helper assigns non-conflicting dev ports (cp bug fixed in DEV-84).
- **pnpm + Turborepo monorepo + `apps/web` (Next.js 16.2.6)** — `pnpm install`, `make build`/`turbo build`, `lint`, `check-types` all pass; dev server boots on the worktree port and serves HTTP 200. (DEV-84, in PR.)

## What's left to build

**M1 — Foundation & Planning (current, target 2026-06-06)**
- [x] `develop` branch created and pushed.
- [x] `apps/web` Next.js app scaffolded; Turborepo wired (`turbo.json`, `pnpm-workspace.yaml`, root `package.json`). _(DEV-84, in PR)_
- [ ] Supabase initialized (`supabase/`), local stack runs, `apps/web/.env.local` wired. _(DEV-85)_
- [ ] Tailwind v4 + shadcn/ui installed; dark mode working.
- [ ] GitHub Actions workflow (gated on `RUN_CI`).
- [ ] Vercel project connected (Git integration); staging + prod Supabase project refs.
- [ ] Brand guidelines, information architecture, wireframes.

**M2/M3 — Public site, content, SEO**
- [ ] Design system + component library.
- [ ] Public pages: Home, Services, About, Insights/blog, Case studies, Contact.
- [ ] Lead-capture / contact form → Supabase (with RLS).
- [ ] Copywriting, SEO/meta/structured data, analytics, perf.

**M4/M5 — Secure portal**
- [ ] Auth (OAuth/JWT) + role-based access control + protected routes.
- [ ] Portal dashboard; timesheet tracking module.
- [ ] Invoicing/billing module (potential payment integration — Stripe).
- [ ] Project/utilities showcase; CRUD with DB integration.

**M6 — Launch**
- [ ] E2E tests, cross-browser/device QA, perf + security audits.
- [ ] DNS / `endlessworlds.xyz` domain setup; production launch.

## Current status

**Bootstrap phase.** Scaffolding and docs done; no application code yet.

## Known issues

- GitHub Actions is over quota this billing cycle (resets ~June 2026); CI gated off via `RUN_CI`.
- EndlessWorlds, LLC is not yet a formally approved entity — proceeding as if it is.

## Evolution of decisions

- 2026-05-23 — Chose two-tier branch flow (`develop` → `main`) over a three-tier `qa` flow; solo build, no branch protection.
- 2026-05-23 — Chose monorepo (pnpm + Turborepo) even though it's a single app, per user preference and to leave room to grow.
- 2026-05-23 — Chose local Supabase via CLI (one shared stack) over per-worktree DBs to keep parallel work simple.
