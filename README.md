# EndlessWorlds

The full build of **endlessworlds.xyz** for **EndlessWorlds, LLC** — a public consulting marketing site (services, insights, lead-gen) plus an authenticated secure portal (dashboard, timesheets, invoicing, project showcase).

> Status: project scaffolding complete; the Next.js app has not been generated yet (first ticket).

## Stack

- **Monorepo** — pnpm workspaces + [Turborepo](https://turborepo.com). Web app at `apps/web`.
- **Framework** — [Next.js](https://nextjs.org) (App Router) + TypeScript.
- **Database** — [Supabase](https://supabase.com) (Postgres), local via the Supabase CLI.
- **UI** — Tailwind v4 + [shadcn/ui](https://ui.shadcn.com), with dark mode.
- **Hosting** — [Vercel](https://vercel.com) (Git integration: branch → preview, `main` → production).
- **Testing** — Vitest (unit/component) + Playwright (E2E).

## Repository layout

```
.
├── apps/
│   └── web/                 # Next.js app  (created in the first ticket)
├── supabase/                # Supabase migrations + config  (created in the first ticket)
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

# 3. Start Supabase + the dev server
make up             # → http://localhost:3000
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
