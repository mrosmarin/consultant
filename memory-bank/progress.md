# Progress

_Last updated: 2026-05-24_

## What works

- Devcontainer (Docker-in-Docker) with pnpm, turbo, gh, commitizen-go, Go, Claude/Kilo CLIs.
- Agentic tooling checked in: skills (`.agents/skills/`, pinned in `skills-lock.json`) + MCP servers (`.mcp.json`). Tokens present in `.devcontainer/.env`.
- Project docs hydrated and consistent: `CLAUDE.md`, `CONTRIBUTING.md`, `DEPLOYMENT-ENV.md`, `WORKTREES.md`, `README.md`, `Makefile`, `scripts/worktree-new.sh`, `.worktreeinclude`.
- Memory bank initialized (this directory).
- Worktree helper assigns non-conflicting dev ports (cp bug fixed in DEV-84).
- **pnpm + Turborepo monorepo + `apps/web` (Next.js 16.2.6)** — `pnpm install`, `make build`/`turbo build`, `lint`, `check-types` all pass; dev server boots on the worktree port and serves HTTP 200. (DEV-84, merged.)
- **Drizzle ORM wired for Neon** — `drizzle.config.ts` + `apps/web/src/db` (client + schema); build/lint/types pass. (DEV-85.)
- **Neon Auth (Better Auth) working** — sign-up/in/out, session, and `/account` route guard (`proxy.ts`) verified live against the real Neon DB (`neon_auth.user` row created). Own forms (no `auth-ui`). (DEV-85.)
- **Tailwind v4 + shadcn/ui + dark mode** — PostCSS plugin, `@theme inline` slate tokens, `next-themes` toggle; auth/account/home restyled. Build/lint/types green; SSR renders shadcn components, compiled CSS has tokens + `.dark`. (DEV-86.)
- **CI workflow** — `.github/workflows/ci.yml` (lint/check-types/build via Turbo) gated on `RUN_CI` (currently `false`). YAML validated. (DEV-87.)

## What's left to build

**M1 — Foundation & Planning (current, target 2026-06-06)**
- [x] `develop` branch created and pushed.
- [x] `apps/web` Next.js app scaffolded; Turborepo wired (`turbo.json`, `pnpm-workspace.yaml`, root `package.json`). _(DEV-84, merged)_
- [x] Neon stack adopted: Drizzle + Neon Auth wired and verified end-to-end. _(DEV-85)_
- [x] Tailwind v4 + shadcn/ui installed; dark mode working; auth/account/home restyled. _(DEV-86)_
- [x] GitHub Actions workflow (gated on `RUN_CI`=false; build needs `NEON_AUTH_*` secrets when enabled). _(DEV-87)_
- [ ] Vercel project connected (Git integration); Neon dev/staging/prod branches + per-env auth. _(DEV-88)_
- [ ] Brand guidelines, information architecture, wireframes.

**M2/M3 — Public site, content, SEO**
- [ ] Design system + component library.
- [ ] Public pages: Home, Services, About, Insights/blog, Case studies, Contact.
- [ ] Lead-capture / contact form → Neon (Drizzle, with RLS).
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

**M1 — Foundation.** Monorepo + Next.js app scaffolded (merged). Adopting the Neon stack (DEV-85): Drizzle wired, docs swapped; Neon Auth + cloud provisioning still to do.

## Known issues

- GitHub Actions is over quota this billing cycle (resets ~June 2026); CI gated off via `RUN_CI`.
- EndlessWorlds, LLC is not yet a formally approved entity — proceeding as if it is.

## Evolution of decisions

- 2026-05-23 — Chose two-tier branch flow (`develop` → `main`) over a three-tier `qa` flow; solo build, no branch protection.
- 2026-05-23 — Chose monorepo (pnpm + Turborepo) even though it's a single app, per user preference and to leave room to grow.
- 2026-05-23 — Initially chose Supabase (local CLI).
- 2026-05-24 — **Reversed: switched to Neon + Neon Auth + Drizzle** over Supabase. Driver: Neon's Vercel-native serverless Postgres + branching, and Neon Auth (Better Auth, RLS-compatible) now covering auth. Switch was cheap (no Supabase code existed). Trade-off accepted: Neon Auth is Beta + AWS-only.
