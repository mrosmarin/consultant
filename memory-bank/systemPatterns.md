# System Patterns

> The app (`apps/web`) is not yet scaffolded. These are the intended conventions; refine once code exists.

## Architecture (intended)

- pnpm + Turborepo monorepo. `apps/web` is the Next.js App Router site, containing **both** the public marketing site and the auth-gated portal (likely `app/(public)` and `app/(portal)` route groups). Shared code (ui, config, types) can move into `packages/*` once the public site and portal start sharing UI.
- Supabase as the backend: Postgres + **Auth (OAuth/JWT)** + Storage. Server-only secrets never reach the client.
- **Portal** is gated by Supabase Auth + middleware-protected routes with role-based access control (RBAC). Timesheets/invoicing are DB-backed CRUD; **payments (Stripe) are a potential add** for invoicing — apply Stripe security best practices (restricted keys, webhooks) if introduced.

## Conventions

- **TypeScript everywhere.** Prefer Server Components; use Client Components only where interactivity requires it.
- **Tailwind v4 + shadcn/ui** for styling and primitives; dark mode via the standard shadcn pattern.
- **DRY** — shared components live in one place, never duplicated per screen.
- **Tests co-located** — `Button.tsx` → `Button.test.tsx` (Vitest). E2E specs in `apps/web/e2e/` (Playwright).
- **Conventional Commits**; branch/commit scopes use the lowercased ticket (`dev-127`), Linear IDs in prose stay uppercase (`DEV-127`).

## Database rules (hard)

- Schema changes **only** via Supabase migration files committed to git — never the dashboard UI.
- **Row-level security on every table** — no exceptions.
- **Soft deletes** — no hard deletes via the UI.
- **Audit trail** on privileged actions.

## Worktree / parallelism pattern

- One feature = one Linear ticket = one `feature/dev-XXX-slug` worktree created via `make worktree-new`.
- Per-worktree Next.js port; single shared Supabase stack from the main checkout.

<!-- TODO: document the actual folder structure, routing, data-access layer, and component patterns after scaffolding -->
