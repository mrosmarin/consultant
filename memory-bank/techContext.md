# Tech Context

## Stack

- **Monorepo:** pnpm workspaces + **Turborepo**. Web app at `apps/web`.
- **Framework:** Next.js (App Router) + TypeScript. Package manager **pnpm**.
- **Database:** Supabase (Postgres). Local dev via the **Supabase CLI** (`pnpm supabase start`) — one shared local stack (`54321` API / `54322` DB / `54323` Studio).
- **UI:** Tailwind v4 + shadcn/ui, dark mode.
- **Hosting:** Vercel (Git integration: branch → preview, `main` → production).
- **Testing:** Vitest (unit/component) + Playwright (E2E).
- **Commits:** Conventional Commits via commitizen-go (`git cz`).

## Repo / hosting facts

- GitHub repo: `mrosmarin/consultant` — **private**, **no branch protection** (conventions enforced manually).
- Branches: `feature/dev-XXX-*` → `develop` (staging) → `main` (production).
- Linear: workspace `Devopolis`, team `Devopolis`, project **EndlessWorlds Website build**, prefix `DEV`.

## Development environment

- **Devcontainer** (VS Code + Docker-in-Docker). `postCreate` runs `.devcontainer/post-install.sh`, which installs pnpm/turbo (global), gh, commitizen-go, Go, and the Claude/Kilo CLIs.
- Tooling tokens live in `.devcontainer/.env` (gitignored, auto-loaded into the container): `LINEAR_API_KEY`, `CONTEXT7_TOKEN`, `GITHUB_TOKEN`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `VERCEL_TOKEN`. These are MCP/CLI inputs — **not** app runtime vars.
- App env vars live in `apps/web/.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- The Postgres service in `.devcontainer/docker-compose.yml` is **commented out** — we use the Supabase CLI stack, not a bare Postgres container.

## Ports & worktrees

- Next.js dev base port `3000`. `make worktree-new` assigns each worktree a deterministic port `3000 + (ticket % 1000)` and writes `PORT` into the worktree's `apps/web/.env.local` when present.
- The Supabase stack is **shared** — start it once from the main checkout; worktrees connect to it. Don't boot a second stack per worktree.

## CI

- GitHub Actions: lint + type-check + build + Vitest on PRs (workflow file not yet committed — lands with the app-scaffold ticket).
- **Actions over quota this cycle (resets ~June 2026).** CI gated on repo variable `RUN_CI` (`false` to skip). No branch protection, so CI is never required to merge.

## MCP / tooling

- MCP servers configured in `.mcp.json` (symlink → `.claude/mcp.json`). Pin explicit versions on server `args`.
- Skills checked into `.agents/skills/`, pinned in `skills-lock.json`.
- For any library/framework/CLI question, fetch current docs via **Context7 MCP** first.

## Tool usage patterns

- Run quality gates via `make` (`make ci`, `make lint`, `make test`, etc.).
- Schema changes only via Supabase migration files committed to git; RLS on every table.

<!-- TODO: fill in concrete package versions and the turbo task graph once apps/web is scaffolded -->
