# Progress

_Last updated: 2026-05-26_

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
- **Live on Vercel** — production deploy at **https://endlessworlds-web.vercel.app**; Git-integrated (`main`→prod, Root Directory `apps/web`, Build Command `next build`). **Neon env isolation done:** Preview deploys use a separate Neon `preview` branch (production untouched; isolation proven). Full portal (M4+M5) promoted to prod via PR #18. (DEV-88, Done.)
- **Brand/IA captured** — `docs/brand-and-ia.md` (DEV-89). **Public site (M2)** — `(marketing)` layout (header/footer), navy/azure theme tokens, **Home** (DEV-90), **Services** (DEV-91), **About** (DEV-92), **Work** (DEV-93: 5 named case studies), **Contact** (DEV-94: lead form → Neon). Insights still a stub. All routes render; build/lint/types green.
- **First app table + migration** — `leads` (Drizzle) with **RLS enabled** + public-insert policy; migration `0000_*` applied to Neon. Contact form insert verified live (row created + cleaned up). (DEV-94.)
- **Secure portal shell + dashboard (M4)** — `app/account/layout.tsx` (sidebar nav + header: email, theme toggle, sign out), `/account` dashboard cards + quick actions, stubbed timesheets/invoices. Session re-checked; guard intact. (DEV-95.)
- **Timesheets module (M5)** — `time_entries` table (Drizzle) with **RLS enabled** + `time_entries_all` policy; migration `0001_*` applied to Neon. Add/soft-delete server actions scoped to the session user; `/account/timesheets` form + entry list; dashboard "Hours this week" wired to the live `sum(hours)`. Build/lint/types green; dev server boots; guard verified; live Neon round-trip verified (insert→query→sum→cleanup). (DEV-96.)
- **Invoicing module (M5)** — `invoices` table (Drizzle) with **RLS enabled** + `invoices_all` policy; migration `0002_*` applied to Neon. Create/status-update/soft-delete server actions scoped to the session user; `/account/invoices` create form + list with status badges (`draft|sent|paid|overdue`); dashboard "Open invoices" wired to the live count (status ≠ paid, not deleted). Build/lint/types green; dev boots; guard verified; live Neon lifecycle round-trip verified (insert→paid→sent→delete→cleanup). PDF/email (DEV-76) + Stripe (DEV-77) deferred. (DEV-97.)
- **SEO foundation (M3)** — Next 16 Metadata API: root title template + `metadataBase` + OG/Twitter defaults + robots; per-page metadata + canonicals; JSON-LD `@graph` (Organization+ProfessionalService/Person/WebSite); `sitemap.ts` + `robots.ts`; branded `opengraph-image` via `next/og`. Site origin via `NEXT_PUBLIC_SITE_URL` (`src/lib/site.ts`). Gates green; sitemap/robots/OG verified on dev — **shipped to prod** (PR #21). (DEV-65.)
- **Analytics (M3)** — Vercel Web Analytics (cookieless; no consent banner). `<Analytics />` in root layout + server-side `track("contact_lead")` (no PII) on lead insert. Web Analytics enabled on the project. GA4 not used; CWV/Speed Insights → DEV-80. (DEV-67.)

## What's left to build

**M1 — Foundation & Planning (current, target 2026-06-06)**
- [x] `develop` branch created and pushed.
- [x] `apps/web` Next.js app scaffolded; Turborepo wired (`turbo.json`, `pnpm-workspace.yaml`, root `package.json`). _(DEV-84, merged)_
- [x] Neon stack adopted: Drizzle + Neon Auth wired and verified end-to-end. _(DEV-85)_
- [x] Tailwind v4 + shadcn/ui installed; dark mode working; auth/account/home restyled. _(DEV-86)_
- [x] GitHub Actions workflow (gated on `RUN_CI`=false; build needs `NEON_AUTH_*` secrets when enabled). _(DEV-87)_
- [~] Vercel: production deploy LIVE + env vars set. **Pending (user):** Git auto-deploy (GitHub App), preview env vars, Neon dev/staging/prod branches. _(DEV-88)_
- [ ] Brand guidelines, information architecture, wireframes. _(DEV-89)_

**M2/M3 — Public site, content, SEO**
- [x] Design system + component library. _(DEV-86/90)_
- [x] Public pages: Home, Services, About, Case studies, Contact. _(DEV-90–94)_ Insights still a stub.
- [x] Lead-capture / contact form → Neon (Drizzle, with RLS). _(DEV-94)_
- [x] SEO: meta/OG/Twitter, canonicals, JSON-LD, sitemap, robots, OG image. _(DEV-65, shipped to prod)_
- [x] Analytics: Vercel Web Analytics + lead conversion event. _(DEV-67)_
- [ ] Copywriting polish (DEV-63/64), insights/blog (DEV-59/66), perf/CWV (DEV-80).

**M4/M5 — Secure portal**
- [x] Auth + protected routes (Neon Auth + `proxy.ts` guard). _(DEV-85)_ RBAC roles still future.
- [x] Portal dashboard + navigation shell. _(DEV-95)_
- [x] Timesheet tracking module (add/soft-delete, list, dashboard hours). _(DEV-96)_
- [x] Invoicing module — create/status/soft-delete, list with badges, dashboard open count. _(DEV-97)_ PDF/email (DEV-76) + Stripe (DEV-77) deferred.
- [ ] Project/utilities showcase; CRUD with DB integration.

**M6 — Launch**
- [ ] E2E tests, cross-browser/device QA, perf + security audits.
- [ ] DNS / `endlessworlds.xyz` domain setup; production launch.

## Current status

**M3 — Content/SEO/Analytics (in progress).** M1/M2 + full portal (M4/M5) live in production. SEO (DEV-65) shipped to prod; Analytics (DEV-67 — Vercel Web Analytics) built + verified, closing into `develop`. Remaining M3: copy polish (DEV-63/64), insights/blog (DEV-59/66). Other open work: utilities showcase (DEV-71), RBAC roles (DEV-69), M6 launch/QA, and a real test suite (no automated coverage yet).

## Known issues

- GitHub Actions is over quota this billing cycle (resets ~June 2026); CI gated off via `RUN_CI`.
- EndlessWorlds, LLC is not yet a formally approved entity — proceeding as if it is.

## Evolution of decisions

- 2026-05-23 — Chose two-tier branch flow (`develop` → `main`) over a three-tier `qa` flow; solo build, no branch protection.
- 2026-05-23 — Chose monorepo (pnpm + Turborepo) even though it's a single app, per user preference and to leave room to grow.
- 2026-05-23 — Initially chose Supabase (local CLI).
- 2026-05-24 — **Reversed: switched to Neon + Neon Auth + Drizzle** over Supabase. Driver: Neon's Vercel-native serverless Postgres + branching, and Neon Auth (Better Auth, RLS-compatible) now covering auth. Switch was cheap (no Supabase code existed). Trade-off accepted: Neon Auth is Beta + AWS-only.
