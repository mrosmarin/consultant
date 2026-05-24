# Active Context

_Last updated: 2026-05-24_

## Current focus

**DEV-86 — Tailwind v4 + shadcn/ui + dark mode done.** UI foundation is in place and the auth/account/home pages are restyled. Remaining M1: CI (DEV-87), Vercel + Neon branches (DEV-88), brand/IA (DEV-89).

## Recent changes

- **DEV-86 (Tailwind v4 + shadcn/ui):** Tailwind v4 via the Next.js **PostCSS** plugin (`@tailwindcss/postcss`, `postcss.config.mjs`); `globals.css` uses the shadcn slate token set with `@theme inline` + `@custom-variant dark` (class strategy). shadcn (`components.json`, `config: ""`) with button/card/input/label/dropdown-menu. Dark mode via **next-themes** (`ThemeProvider` in layout, `suppressHydrationWarning`, `ModeToggle`). Restyled sign-in/up, `/account`, home (removed inline styles + `page.module.css`). Verified: build/lint/check-types green; SSR HTML renders shadcn components; compiled CSS has the tokens + `.dark` overrides. (No live browser screenshot — no browser installed — but the toggle machinery is wired.)
  - **Finding:** `next build` requires `NEON_AUTH_*` env present, because `createNeonAuth()` validates `cookies.secret` eagerly at module load (the `[...path]` route is evaluated during page-data collection). CI (DEV-87) and Vercel (DEV-88) must provide `NEON_AUTH_BASE_URL` + `NEON_AUTH_COOKIE_SECRET` at build time, or we make auth init lazy.
- **DEV-85 (Neon Auth):** Enabled Neon Auth (`better_auth`) on the project's default branch via the Neon Console (Auth base URL `…neonauth.c-8.us-east-1.aws.neon.tech/neondb/auth`). Wired the SDK in `apps/web`: `src/lib/auth/{server,client}.ts`, catch-all `src/app/api/auth/[...path]/route.ts`, **`src/proxy.ts`** (Next 16's middleware) guarding `/account/*`, sign-in/up forms + server actions, and a protected `/account` page. **Verified live:** sign-up → 200 (created a row in `neon_auth.user`), `get-session` → 200, `/account` 307→`/auth/sign-in` unauthenticated and 200 with a session. Built our own forms (not `@neondatabase/auth-ui`, which has a Beta peer-dep mismatch). Env in gitignored `apps/web/.env.local`.
- **DEV-85 (stack switch):** Decided **Neon over Supabase** (2026-05-24). Neon Auth (Beta, built on Better Auth, RLS-compatible `neon_auth` schema) removes the "DB-only" downside. Swapped all docs/memory-bank to Neon; added Drizzle (`drizzle-orm` + `@neondatabase/serverless` + `drizzle-kit`) with `drizzle.config.ts` + `apps/web/src/db`; rewrote `apps/web/.env.example` (`DATABASE_URL`/`DATABASE_URL_UNPOOLED`, Neon Auth vars); Makefile db targets → Drizzle. Build/lint/types verified.
- **DEV-84:** Created the pnpm + Turborepo monorepo (root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, prettier, `.nvmrc`) and scaffolded `apps/web` via `create-next-app` — **Next.js 16.2.6 + React 19.2.4**, App Router, TS, ESLint, `src/`, `@/*` alias, **no Tailwind yet** (that's DEV-86). Added `check-types` script and `apps/web/.env.example`. Allowed native builds (`sharp`, `unrs-resolver`) at the workspace root; removed the stray `apps/web/pnpm-workspace.yaml`. Fixed a `cp` bug in `worktree-new.sh` (non-glob entries like `.env.local` now skipped if absent). Verified: `pnpm install`, `check-types`, `lint`, `build` (clean), and dev server on port 3084 → HTTP 200.
- **Bootstrap (DEV-83):** Hydrated all scaffold docs; locked stack (Next.js + pnpm + Turborepo, Supabase local CLI, Tailwind v4 + shadcn/ui, Vercel, Vitest + Playwright); branching `feature/dev-XXX-*` → `develop` → `main` (private repo, no protection, solo); per-worktree dev-port + shared-Supabase convention; `RUN_CI` Actions-quota kill-switch (over quota until ~June 2026).

> Note: `apps/web/CLAUDE.md`/`AGENTS.md` (from create-next-app) warn that **Next.js 16 has breaking changes vs. older docs** — consult `node_modules/next/dist/docs/` before writing Next.js code.

## Project scope (per Linear — source of truth)

Two workstreams across 6 milestones (target 2026-08-31, priority Urgent): **Public marketing site** (M2/M3) + **authenticated secure portal** with timesheets, invoicing, project showcase (M4/M5). Domain: `endlessworlds.xyz`. See [projectbrief](projectbrief.md) for the milestone table.

## Next steps — M1: Foundation & Planning (target 2026-06-06)

> All work below goes in a worktree feature branch (`make worktree-new TICKET=… SLUG=…`) → PR to `develop`. The bootstrap itself was the one-time exception, seeded directly onto `develop`.

1. ~~Create `develop`~~ ✅. ~~Scaffold `apps/web`~~ ✅ (DEV-84). ~~Neon + Neon Auth~~ ✅ (DEV-85). ~~Tailwind v4 + shadcn + dark mode~~ ✅ (DEV-86).
2. **DEV-87 — GitHub Actions workflow** gated on `RUN_CI` (note: build needs `NEON_AUTH_*` env — set as CI secrets/vars).
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
