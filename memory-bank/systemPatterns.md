# System Patterns

> `apps/web` is scaffolded (Next.js 16); data layer + auth are being wired (DEV-85). Refine these as code lands.

## Architecture (intended)

- pnpm + Turborepo monorepo. `apps/web` is the Next.js App Router site, containing **both** the public marketing site and the auth-gated portal (likely `app/(public)` and `app/(portal)` route groups). Shared code (ui, config, types) can move into `packages/*` once the public site and portal start sharing UI.
- **Neon** (serverless Postgres) as the database, accessed via **Drizzle ORM** (client in `apps/web/src/db`). Server-only connection strings never reach the client; use the **pooled** `DATABASE_URL` at runtime and the **unpooled** one for migrations.
- **Auth: Neon Auth** (built on Better Auth) — users live in the `neon_auth` schema (RLS-compatible). The **portal** is gated by Neon Auth + middleware-protected routes with role-based access control (RBAC, likely via Better Auth's organization/access-control plugins — verify). Timesheets/invoicing are DB-backed CRUD; **payments (Stripe) are a potential add** for invoicing — apply Stripe security best practices (restricted keys, webhooks) if introduced.

## Conventions

- **TypeScript everywhere.** Prefer Server Components; use Client Components only where interactivity requires it.
- **Tailwind v4 + shadcn/ui** for styling and primitives; dark mode via the standard shadcn pattern.
- **DRY** — shared components live in one place, never duplicated per screen.
- **Tests co-located** — `Button.tsx` → `Button.test.tsx` (Vitest). E2E specs in `apps/web/e2e/` (Playwright).
- **Conventional Commits**; branch/commit scopes use the lowercased ticket (`dev-127`), Linear IDs in prose stay uppercase (`DEV-127`).

## Database rules (hard)

- Schema changes **only** via Drizzle migrations committed to git (`db:generate` → review SQL → `db:migrate`) — never ad-hoc in a dashboard.
- **Row-level security on every table** — no exceptions.
- **Soft deletes** — no hard deletes via the UI.
- **Audit trail** on privileged actions.

## Worktree / parallelism pattern

- One feature = one Linear ticket = one `feature/dev-XXX-slug` worktree created via `make worktree-new`.
- Per-worktree Next.js port; no local DB (Neon is cloud) — each worktree's `DATABASE_URL` points at a Neon branch.

<!-- TODO: document the actual folder structure, routing, data-access layer, and component patterns after scaffolding -->
