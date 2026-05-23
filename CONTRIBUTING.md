# Contributing

## Quick links

- App code: `apps/web` (Next.js) — see [README.md](README.md) for full structure and dev commands
- Day-to-day commands: top-level [`Makefile`](Makefile) — run `make help`
- **Source of truth for scope:** [Linear / Devopolis](https://linear.app/devopolis) → project **EndlessWorlds Website build**. Every PR references a `DEV-XXX` ticket.

## Branching

| Branch | Purpose | Who creates it | Rules |
|---|---|---|---|
| `main` | Production — only `develop` merges here | Never created manually | PR from `develop` only, CI green (when enabled), no force push |
| `develop` | Staging — all features land here first | Never created manually | PR required, CI green (when enabled), no force push |
| `feature/dev-XXX-description` | All feature work | You / Claude Code / Kilo Code | Lives only until merged |
| `hotfix/dev-XXX-description` | Urgent production fixes | You | Same flow, expedited review |

**Rules:**

- All feature branches PR to `develop` — **never directly to `main`**.
- `main` accepts PRs only from `develop`.
- This is a **private repo with no GitHub branch protection** — the rules above are enforced by convention. No required approvals (solo); you self-merge. Claude Code's "never commit or push without explicit user approval" rule is the safety net.
- Branch names use lowercase + hyphens with the lowercased ticket ID: `feature/dev-175-add-hero-section`. The Linear ID itself stays uppercase in prose (`DEV-175`).

## Commit messages

Conventional Commits (enforced locally via **commitizen-go** — run `git cz` or `cz` for a guided prompt). Scope is the **lowercase Linear ticket ID** for feature/fix work, or a domain like `tooling`/`ci`/`docs`/`memory-bank` for cross-cutting work.

| Type | Example | When |
|---|---|---|
| `feat` | `feat(dev-127): add services section` | New user-facing functionality |
| `fix` | `fix(dev-9): correct RLS rule on leads table` | Bug fix |
| `chore` | `chore(tooling): update CI config` | Tooling, config, lockfile bumps |
| `docs` | `docs(memory-bank): update progress after sprint` | Documentation only |
| `style` | `style: format baseline` | Formatting, no semantic change |
| `test` | `test(dev-114): add unit tests for contact form` | Test additions/changes only |
| `refactor` | `refactor(dev-11): extract shared layout` | Internal restructuring, no behavior change |

## PR process

1. **Create a feature branch** from up-to-date `develop`. The recommended path is the worktree helper, which gives parallel sessions their own working directory, copies env files, and assigns a non-conflicting dev port. See [WORKTREES.md](WORKTREES.md) for the full workflow.

   ```bash
   make worktree-new TICKET=192 SLUG=my-feature
   # → creates .claude/worktrees/dev-192-my-feature/  (gitignored)
   #   on branch feature/dev-192-my-feature off origin/develop
   #   copies env files and writes a per-worktree PORT
   ```

   Plain checkout in the main clone is still supported:

   ```bash
   git fetch origin
   git checkout -b feature/dev-XXX-description origin/develop
   ```

2. **Code, commit, push.** Pre-commit hooks (if configured) run lint-staged on every commit. CI runs the full gate on every push (when `RUN_CI` is enabled — see below).

3. **Open PR → base: `develop`**. The PR title is the conventional-commit subject (e.g., `feat(dev-127): add services section`). Reference the Linear ticket (`DEV-127`) in the body.

4. **CI must pass** before merge — when CI is enabled. See the Actions-quota note below.

5. **Merge to `develop`.** Squash or merge — preserve the conventional-commit subject in history. Vercel builds a preview for the branch.

6. **Release to `main`:** open PR `develop` → `main`. No required approvals (solo). After merge, Vercel deploys production automatically.

## CI

Every PR to `develop` or `main` runs the GitHub Actions pipeline:

1. **Setup** — Node + pnpm, dependency cache
2. **Lint** — ESLint, zero-warning tolerance
3. **Type check** — `tsc --noEmit` via `turbo check-types`
4. **Build** — `turbo build` (production build)
5. **Unit tests** — Vitest
6. **E2E** (optional/nightly) — Playwright

> The workflow file lands with the app-scaffold ticket — it is not yet committed.

### Actions quota kill-switch (temporary)

GitHub Actions is **over quota for this billing cycle** (resets ~June 2026). Until then:

- The workflow is gated on a repo **variable `RUN_CI`**. Set `RUN_CI=false` to skip runs and stop burning minutes; flip to `true` when the quota resets.
  ```bash
  gh variable set RUN_CI --body false --repo mrosmarin/consultant   # disable
  gh variable set RUN_CI --body true  --repo mrosmarin/consultant   # re-enable
  ```
- For one-off skips, include `[skip ci]` in the commit subject.
- With no branch protection, CI is never *required* to merge, so skipping it doesn't block the flow. This is a deliberate, time-boxed exception.

## Testing

**Unit / component tests:**
- Framework: **Vitest**
- Co-locate tests next to the file under test: `Button.tsx` → `Button.test.tsx`
- Run: `pnpm test` (or `make test`)

**E2E tests:**
- Framework: **Playwright** (the Playwright VS Code extension ships in the devcontainer)
- Specs live in `apps/web/e2e/`
- Run: `pnpm test:e2e` (or `make test-e2e`)

## First-time setup

All development environments use **devcontainers with VS Code and Docker-in-Docker**.

```bash
# 1. Open in devcontainer (VS Code will prompt, or use the command palette).
#    postCreate runs .devcontainer/post-install.sh (pnpm, turbo, gh, supabase CLI, etc.)

# 2. Install dependencies
pnpm install

# 3. Start the local Supabase stack + dev server
make up
```

## Environment variables

Each app has its own env file(s). Real values are never committed.

1. **Copy the example file:**

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

2. **Fill in values** — Supabase URL + keys come from `supabase start` output (local) or the Supabase dashboard (cloud). See `apps/web/.env.example` for descriptions.

3. **Never commit `.env.local`.** It is gitignored at every level. `.env.example` is the only env file that ships.

Tooling tokens (Linear, Context7, GitHub, Vercel) live in `.devcontainer/.env` (gitignored) and are auto-loaded into the container — they are **not** app env vars.

## Production env vars

Production values are configured in the Vercel dashboard. See [DEPLOYMENT-ENV.md](DEPLOYMENT-ENV.md) for the full secret inventory.

## Editor

`.vscode/settings.json` and `.vscode/extensions.json` (when present) are committed so VS Code users get format-on-save and the recommended extension list. `.editorconfig` covers other editors. Local-only VS Code state (e.g. `.vscode/launch.json`) is gitignored.
