# EndlessWorlds

The full build of **endlessworlds.xyz** for **EndlessWorlds, LLC** — a public consulting marketing site (services, insights, lead-gen) plus an authenticated secure portal (dashboard, **companies/clients**, timesheets, invoicing, project showcase).

> Status (M3 — Content/SEO/Analytics): **Live at https://endlessworlds.xyz** — public marketing site + full secure portal (auth + **email allowlist**, dashboard, **companies** with hourly/retainer billing terms, **timesheets** logged against a company with optional start/end times, **invoicing**), SEO (Metadata API, JSON-LD, sitemap, robots, OG image — DEV-65), and **Google Analytics 4** behind a cookie-consent banner (DEV-67, active). Isolated **staging/QA** at https://staging.endlessworlds.xyz (own Neon project + auth; `make db-reset-staging` for clean E2E). In flight: company/client onboarding (DEV-101), auth UX polish (DEV-102); next accrual (DEV-103), company docs (DEV-104), Drive/PDF (DEV-105). Next M3: copy polish (DEV-63/64), insights/blog (DEV-59/66). Deferred: invoice PDF/email (DEV-76), Stripe (DEV-77).

## Stack

- **Monorepo** — pnpm workspaces + [Turborepo](https://turborepo.com). Web app at `apps/web`.
- **Framework** — [Next.js](https://nextjs.org) (App Router) + TypeScript.
- **Database** — [Neon](https://neon.com) serverless Postgres via [Drizzle ORM](https://orm.drizzle.team).
- **Auth** — [Neon Auth](https://neon.com/docs/auth/overview) (managed, built on Better Auth).
- **UI** — Tailwind v4 + [shadcn/ui](https://ui.shadcn.com), with dark mode.
- **Hosting** — [Vercel](https://vercel.com) (Git integration: branch → preview, `main` → production).
- **Testing** — Vitest (unit/component) + Playwright (E2E).

## Repository layout

```
.
├── apps/
│   └── web/                 # Next.js 16 app (App Router, TS)
│       ├── src/db/          # Drizzle client + schema
│       └── drizzle/         # generated Drizzle migrations
├── .agents/skills/          # checked-in agent skills (pinned in skills-lock.json)
├── .claude/                 # Claude Code config, rules, worktrees (gitignored worktrees)
├── .devcontainer/           # devcontainer (Docker-in-Docker) + tooling tokens
├── memory-bank/             # session memory for Claude Code — read at session start
├── scripts/                 # worktree-new.sh, claude-audit.sh
├── CLAUDE.md                # Claude Code session instructions
├── CONTRIBUTING.md          # branching, commits, PR process, CI, setup
├── DEPLOYMENT-ENV.md        # environments, secrets, deploy pipeline
├── WORKTREES.md             # parallel worktree workflow
└── Makefile                 # day-to-day commands (run `make help`)
```

## Quickstart

All development runs inside a **devcontainer** (VS Code + Docker-in-Docker).

```bash
# 1. Open in the devcontainer (VS Code prompts to "Reopen in Container").
#    postCreate runs .devcontainer/post-install.sh.

# 2. Install dependencies
pnpm install        # or: make install

# 3. Set apps/web/.env.local (copy from .env.example; fill DATABASE_URL from Neon)
#    Optional: NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX enables Google Analytics 4
#    (loads only after the cookie-consent banner is accepted).

# 4. Start the dev server
make dev            # → http://localhost:3000
```

Run `make help` for the full command list (build, lint, types, tests, db, worktrees).

## Workflow

- **Source of truth:** [Linear / Devopolis](https://linear.app/devopolis) → project **EndlessWorlds Website build**. Tickets use the `DEV` prefix.
- **Branching:** `feature/dev-XXX-description` → PR to `develop` → merge → PR `develop` → `main` → Vercel production deploy. Private repo, no branch protection — conventions enforced manually. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Parallel work:** use `make worktree-new TICKET=123 SLUG=my-feature`. Each worktree gets a non-conflicting dev port. See [WORKTREES.md](WORKTREES.md).
- **Commits:** Conventional Commits (commitizen-go: `git cz`).

## Documentation

| Doc | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Claude Code session instructions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, commits, PR process, CI, setup |
| [DEPLOYMENT-ENV.md](DEPLOYMENT-ENV.md) | Environments, secrets, deploy pipeline |
| [WORKTREES.md](WORKTREES.md) | Parallel worktree workflow |
| `memory-bank/` | Project context Claude Code reads at session start |
