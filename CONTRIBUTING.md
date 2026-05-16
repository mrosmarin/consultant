# Contributing

## Quick links

- Project repo: `<APP_ROOT>` — see [README.md](README.md) for full structure and dev commands
- Day-to-day commands: top-level [`Makefile`](Makefile) — run `make help`
- **Source of truth for scope:** [Linear / <LINEAR_WORKSPACE>](https://linear.app/<LINEAR_WORKSPACE>). Every PR references a `<PREFIX>-XXX` ticket.

## Branching

| Branch | Purpose | Who creates it | Rules |
|---|---|---|---|
| `<PROD_BRANCH>` | Production — only `<BASE_BRANCH>` merges here | Never created manually | PR required, **<APPROVALS_REQUIRED> approval(s)**, CI must pass, no force push, source = `<BASE_BRANCH>` only |
| `<BASE_BRANCH>` | Staging — all features land here first | Never created manually | PR required, CI must pass, no force push |
| `feature/<PREFIX>-XXX-description` | All feature work | Team / Claude Code | Lives only until merged |
| `hotfix/<PREFIX>-XXX-description` | Urgent production fixes | Team | Same flow, expedited review |

**Rules:**

- All feature branches PR to `<BASE_BRANCH>` — **never directly to `<PROD_BRANCH>`**.
- `<PROD_BRANCH>` accepts PRs only from `<BASE_BRANCH>`. Other source branches are rejected by reviewers.
- Direct commits to `<BASE_BRANCH>`/`<PROD_BRANCH>` and force-pushes are disallowed by team rule. Claude Code's "never commit or push without explicit user approval" rule is the safety net.
- Branch names use lowercase + hyphens. Always include the ticket number: `feature/<PREFIX>-175-add-auth`.

## Commit messages

Conventional Commits. Scope is the **lowercase Linear ticket ID** for feature/fix work, or a domain like `tooling`/`ci`/`docs`/`memory-bank` for cross-cutting work.

| Type | Example | When |
|---|---|---|
| `feat` | `feat(<PREFIX>-127): add auth guard component` | New user-facing functionality |
| `fix` | `fix(<PREFIX>-9): correct RLS rule on users table` | Bug fix |
| `chore` | `chore(tooling): update CI config` | Tooling, config, lockfile bumps |
| `docs` | `docs(memory-bank): update progress after sprint` | Documentation only |
| `style` | `style: format baseline` | Formatting, no semantic change |
| `test` | `test(<PREFIX>-114): add unit tests for auth hook` | Test additions/changes only |
| `refactor` | `refactor(<PREFIX>-11): extract shared hook` | Internal restructuring, no behavior change |

## PR process

1. **Create a feature branch** from up-to-date `<BASE_BRANCH>`. The recommended path is the worktree helper, which gives parallel sessions their own working directory and copies env files automatically. See [WORKTREES.md](WORKTREES.md) for the full workflow.

   ```bash
   make worktree-new TICKET=192 SLUG=my-feature
   # → creates .claude/worktrees/<PREFIX>-192-my-feature/  (gitignored)
   #   on branch feature/<PREFIX>-192-my-feature off origin/<BASE_BRANCH>
   #   and copies env files
   ```

   Plain checkout in the main clone is still supported:

   ```bash
   git fetch origin
   git checkout -b feature/<PREFIX>-XXX-description origin/<BASE_BRANCH>
   ```

2. **Code, commit, push.** Pre-commit hooks (if configured) run lint-staged on every commit. CI runs the full gate on every push.

3. **Open PR → base: `<BASE_BRANCH>`**. The PR title is the conventional-commit subject (e.g., `feat(<PREFIX>-127): add auth guard component`). Fill in the PR template checklist; strike through or mark **N/A** for sections that don't apply.

4. **CI must pass** before merge — no exceptions.

5. **Merge to `<BASE_BRANCH>`.** Squash or merge — preserve conventional-commit subject in history.

6. **Release to `<PROD_BRANCH>`:** open PR `<BASE_BRANCH>` → `<PROD_BRANCH>`. Requires **<APPROVALS_REQUIRED> approval(s)**. CI re-runs. After merge, production deploy fires automatically.

## CI

Every PR to `<BASE_BRANCH>` or `<PROD_BRANCH>` runs the CI pipeline:

1. **Setup** — language runtime, package manager, dependency cache
2. **Lint** — linter with zero-warning tolerance
3. **Type check** — static type analysis
4. **Build** — production build
5. **Unit tests** — test suite

<!-- Add or remove steps based on your actual CI pipeline during bootstrap -->

## Testing

<!-- Fill in during bootstrap based on your test framework answers -->

**Unit tests:**
- Framework: `<TEST_FRAMEWORK>`
- Co-locate tests next to the file under test: `Button.tsx` → `Button.test.tsx`
- Run: `<PACKAGE_MANAGER> test`

**E2E tests (if applicable):**
- Framework: `<E2E_FRAMEWORK>`
- Run: `<PACKAGE_MANAGER> test:e2e`

## First-time setup

All development environments use **devcontainers with VS Code and Docker-in-Docker**.

```bash
# 1. Open in devcontainer (VS Code will prompt, or use the command palette)

# 2. Install dependencies
<INSTALL_CMD>

# 3. Start local services + dev server
make up
```

<!-- Expand during bootstrap with database setup, seed data, etc. -->

## Environment variables

Each app has its own env file(s). Real values are never committed.

1. **Copy the example files:**

   ```bash
   cp .env.example .env.local
   # Repeat for each app in a monorepo
   ```

2. **Fill in values** — see `.env.example` for descriptions of each key.

3. **Never commit `.env.local`.** It is gitignored at every level. `.env.example` is the only env file that ships.

<!-- Expand during bootstrap with your actual env var table -->

## Production env vars

Production values are configured in the deploy platform dashboard (<DEPLOY_PLATFORM>). See [DEPLOYMENT-ENV.md](DEPLOYMENT-ENV.md) for the full secret inventory.

## Editor

`.vscode/settings.json` and `.vscode/extensions.json` are committed so VS Code users get format-on-save and the recommended extension list. `.editorconfig` covers other editors. Local-only VS Code state (e.g. `.vscode/launch.json`) is gitignored.
