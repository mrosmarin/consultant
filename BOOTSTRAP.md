# Project Bootstrap

> **Run this once with Claude Code.** This file walks through an interactive setup that collects your project's details, then uses the answers to populate all the template docs. Delete this file when done.

---

## How it works

1. Open Claude Code at the repo root.
2. Say: **"Run the bootstrap process in BOOTSTRAP.md"**
3. Claude Code will ask the questions below, one section at a time.
4. After all answers are collected, Claude Code will:
   - Update `CLAUDE.md`, `CONTRIBUTING.md`, `DEPLOYMENT-ENV.md`, `WORKTREES.md`, `README.md`, and the `Makefile` with your project-specific values.
   - Remove all `<PLACEHOLDER>` markers.
   - Delete this file.
   - Make a single commit: `chore(bootstrap): hydrate project docs from bootstrap answers`

---

## Questions

Claude Code: ask these in order. Collect all answers before editing any files. If the user doesn't know an answer yet, mark it `TBD` in the docs — they can fill it in later.

### 1 — Project identity

- What is the project name? (used in README title, doc headers)
- One-line description of what you're building?
- Is this a monorepo? If so, what is the root app directory? (e.g. `apps/`, `packages/`, or flat)
- What is the GitHub repo path? (e.g. `org/repo-name`)

### 2 — Linear workspace

- What is your Linear workspace slug? (the part after `linear.app/` — e.g. `myteam`)
- What is your ticket prefix? (e.g. `NOB`, `ENG`, `PROJ` — used in branch names like `feature/<prefix>-123-description`)
- Are there multiple Linear projects/teams, or just one? If multiple, list them with their prefixes.

### 3 — Branching & environments

- What is your base branch for feature work? (e.g. `qa`, `develop`, `staging`)
- What is your production branch? (e.g. `main`, `production`)
- Does merging to production require approvals? How many?
- Is branch protection enforced by GitHub, or convention-only?

### 4 — Tech stack

- What language/framework? (e.g. Next.js, Rails, Go, Python/FastAPI)
- Package manager? (e.g. pnpm, npm, yarn, pip, cargo)
- Database? (e.g. Supabase/Postgres, PlanetScale, MongoDB, none yet)
- Hosting/deploy platform? (e.g. Vercel, Railway, Fly.io, AWS)
- Any other key services? (e.g. Redis, S3, Stripe, auth provider)

### 5 — Development environment

All environments use **devcontainers running VS Code with Docker-in-Docker**.

- Do you have an existing `.devcontainer/devcontainer.json`? If so, what's in it?
- Are there local services started via Docker Compose? (e.g. local database, Redis)
- What ports do your dev servers use? (e.g. `3000`, `8080`)
- Are there `.env.local` or `.env` files that need to be copied into worktrees? List the glob patterns (these go into `.worktreeinclude` — e.g. `.env.local`, `apps/*/.env.local`, `config/local.json`).
- What is the first-time setup sequence? (e.g. `pnpm install` → `docker compose up` → `pnpm dev`)

### 6 — CI/CD

- Do you have CI workflows already? What do they run? (lint, types, tests, build)
- What test framework(s)? (e.g. Vitest, Jest, Playwright, pytest)
- Any deploy automation on merge? (e.g. Vercel auto-deploy, GitHub Actions deploy script)
- Are there secrets that CI needs? (don't share values — just the names, e.g. `DATABASE_URL`, `DEPLOY_TOKEN`)

### 7 — Team

- Who's on the team? (names and roles — used for PR approval rules, CODEOWNERS, etc.)
- Is this currently a solo project?
- Any external collaborators (Lovable, Cursor, other AI tools)?

### 8 — Existing docs

- Are there any existing docs, READMEs, or architecture notes to preserve or migrate?
- Any project-specific conventions not covered above? (naming, folder structure rules, etc.)

---

## After collection

Claude Code: once all answers are gathered, perform these steps in order:

1. **Find-and-replace all `<PLACEHOLDER>` tokens** across every template doc using the answers above. The mapping:

   | Placeholder | Source |
   |---|---|
   | `<PROJECT_NAME>` | Q1 — project name |
   | `<PROJECT_DESCRIPTION>` | Q1 — one-line description |
   | `<REPO_PATH>` | Q1 — GitHub repo path (e.g. `org/repo`) |
   | `<APP_ROOT>` | Q1 — monorepo app directory |
   | `<LINEAR_WORKSPACE>` | Q2 — workspace slug |
   | `<PREFIX>` | Q2 — ticket prefix |
   | `<BASE_BRANCH>` | Q3 — base branch for feature work |
   | `<PROD_BRANCH>` | Q3 — production branch |
   | `<APPROVALS_REQUIRED>` | Q3 — number of approvals for prod merge |
   | `<PACKAGE_MANAGER>` | Q4 — package manager |
   | `<DATABASE>` | Q4 — database |
   | `<DEPLOY_PLATFORM>` | Q4 — hosting platform |
   | `<DEV_PORT>` | Q5 — default dev server port |
   | `<ENV_FILES>` | Q5 — list of env files to copy into worktrees |
   | `<INSTALL_CMD>` | Q5 — install command (e.g. `pnpm install`) |
   | `<DEV_CMD>` | Q5 — dev server command (e.g. `pnpm dev`) |

2. **Fill in project-specific sections** that can't be simple replacements (CI steps, env var tables, secret inventories) based on the answers.

3. **Initialize the memory bank.** Create the following structure using the bootstrap answers:

   ```
   memory-bank/
   ├── projectbrief.md        ← project name, description, goals, target users
   ├── productContext.md       ← what the product does, problems it solves, UX goals
   ├── techContext.md          ← stack, architecture, key packages, infra decisions
   ├── systemPatterns.md       ← coding conventions, folder structure, design patterns
   ├── activeContext.md        ← current focus, recent changes, next steps
   └── progress.md            ← what works, what doesn't, known issues
   ```

   `.claude/rules/memory-bank.md` already exists and tells Claude Code to read these files at session start — no need to create it.

   Populate each file with what's known from the bootstrap answers. Mark sections that need more detail with `<!-- TODO: fill in after first sprint -->`. The memory bank doesn't need to be perfect — it just needs to exist so the first real session has something to read.

4. **Hydrate the worktree script and `.worktreeinclude`.** In `scripts/worktree-new.sh`, replace:
   - `TICKET_PREFIX="<PREFIX>"` with the actual ticket prefix (lowercase).
   - `BASE_BRANCH="<BASE_BRANCH>"` with the actual base branch.
   - `<INSTALL_CMD>` and `<DEV_CMD>` / `<DEV_PORT>` in the help text at the bottom.

   In `.worktreeinclude`, replace the default patterns with the actual glob patterns from Q5 (e.g. `apps/*/.env.local`, `.env`, `config/local.json`). Make sure `chmod +x scripts/worktree-new.sh scripts/claude-audit.sh`.

5. **Update the Makefile** — wire `worktree-new`, `worktree-list`, `worktree-prune`, `install`, `dev`, `up`, `claude-audit`, and any other targets to match the actual commands. Remove commented-out placeholder targets that don't apply (e.g. `db-*` if there's no database yet).

6. **Update README.md** with project name, description, setup instructions, and architecture overview.

7. **Review all files** for any remaining `<PLACEHOLDER>` or `TBD` markers. List them for the user.

8. **Delete this file** (`BOOTSTRAP.md`).

9. **Commit everything:**
   ```
   chore(bootstrap): hydrate project docs and initialize memory bank
   ```

---

## File manifest

After bootstrap, the repo should have:

| File | Purpose |
|---|---|
| `CLAUDE.md` | Claude Code session instructions |
| `CONTRIBUTING.md` | Branching, commits, PR process, CI, setup |
| `DEPLOYMENT-ENV.md` | Environments, secrets, deploy pipeline |
| `WORKTREES.md` | Parallel worktree workflow |
| `README.md` | Project overview and quickstart |
| `Makefile` | Day-to-day commands |
| `scripts/worktree-new.sh` | Worktree creation helper |
| `scripts/claude-audit.sh` | Claude Code permission settings auditor |
| `.worktreeinclude` | Gitignored files to copy into new worktrees |
| `memory-bank/` | Session memory (activeContext.md, progress.md, etc.) |
| `.claude/rules/memory-bank.md` | Claude Code rule to load memory bank |