# Deployment & Environments

Reference for the full deploy pipeline: every environment, every secret, where each one lives, and how to rotate them.

If you're adding a feature that needs a new env var or rotating a leaked credential, this is the doc.

---

## TL;DR

| Git branch | Deploy target | Scope | Migration / schema application |
|---|---|---|---|
| `<PROD_BRANCH>` | Production | Production | Auto on push (or manual — see pipeline section) |
| `<BASE_BRANCH>` | Staging | Preview / Staging | Auto on push |
| `feature/<PREFIX>-XXX-*` PR | Preview | Preview | Auto on PR (if applicable) |
| `localhost` | Local dev (devcontainer) | n/a | Manual (`migrate` / `db reset`) |

---

## Environments

### 1. Local (devcontainer)

**What:** All development runs inside a **devcontainer with VS Code and Docker-in-Docker**. Local services (database, cache, etc.) run as Docker containers inside the devcontainer.

**Where keys live:** `.env.local` (gitignored). Populated from the output of local service startup or from `.env.example`.

**Setup:**
```bash
# VS Code will prompt to reopen in devcontainer, or:
# Command Palette → "Dev Containers: Reopen in Container"

# Then:
<INSTALL_CMD>
make up        # starts local services + dev servers
```

**Ports:** Dev server defaults to `<DEV_PORT>`. Override with `PORT=XXXX` if running multiple worktrees concurrently.

### 2. Preview / PR

**What:** When a PR is opened against `<BASE_BRANCH>`:
- The deploy platform builds + deploys a preview URL automatically.
- If the PR touches database schema files, a preview/ephemeral database instance may be created (depends on your database provider's branching support).
- On merge: ephemeral resources auto-destroy.

<!-- Expand during bootstrap with your specific preview setup -->

### 3. Staging (`<BASE_BRANCH>`)

**What:**
- The `<BASE_BRANCH>` branch is the staging environment. All feature PRs target `<BASE_BRANCH>` first.
- Pushes to `<BASE_BRANCH>` auto-deploy to the staging environment.
- Schema changes are applied automatically (or via CI dry-run + manual apply — document your pattern).

### 4. Production (`<PROD_BRANCH>`)

**What:**
- The `<PROD_BRANCH>` branch is production. PRs require <APPROVALS_REQUIRED> approval(s) + CI green.
- The deploy platform deploys on push to `<PROD_BRANCH>`.
- Schema changes are applied automatically on push.

---

## Secret inventory

### Local devcontainer env vars (gitignored)

The devcontainer auto-loads env vars from `.devcontainer/.env` (or your configured path). These are inputs to CLI tooling and local development.

| Env var | Purpose | Source |
|---|---|---|
| <!-- Fill during bootstrap --> | | |

**Regeneration policy:**
- API tokens: rotate every ~90 days or immediately if compromised.
- Database passwords: rotate via provider dashboard if leaked.
- Project IDs: never change unless a project is recreated.

### Deploy platform env vars (<DEPLOY_PLATFORM>)

<!-- Fill during bootstrap with your actual env var scopes and values -->

Each deploy environment (production, staging, preview) carries its own set of env vars. Configure in the <DEPLOY_PLATFORM> dashboard or via CLI.

| Var | Production | Staging | Preview | Source |
|---|---|---|---|---|
| `DATABASE_URL` | prod connection string | staging connection string | preview/ephemeral | Provider dashboard |
| <!-- Add rows during bootstrap --> | | | | |

**Where to inspect:** <DEPLOY_PLATFORM> dashboard → project → Settings → Environment Variables.

### CI secrets (GitHub repo secrets)

Secrets used by GitHub Actions workflows. Set at repository scope (Settings → Secrets and variables → Actions).

| Secret | Used by | Purpose |
|---|---|---|
| <!-- Fill during bootstrap --> | | |

**To set or rotate:**
```bash
# Pipe value via stdin so it never appears in process listings
printf '%s' "$VALUE" | gh secret set SECRET_NAME --repo <REPO_PATH>
```

> ⚠️ **Gotcha:** `gh secret set NAME --body -` sets the literal string `"-"`, not stdin. Omit `--body` to read from stdin, or use `--body "$VALUE"` with the actual value.

---

## How the migration / schema pipeline works

### Local

```bash
# Create a new migration
<MIGRATION_NEW_CMD>

# Apply all migrations (reset local DB)
<MIGRATION_APPLY_CMD>

# Diff live DB against migration set
<MIGRATION_DIFF_CMD>
```

<!-- Fill during bootstrap with your actual database migration commands -->

### PR flow

1. Open PR → deploy platform builds preview.
2. If the PR adds/edits schema migration files, the database provider may create an ephemeral instance and apply migrations to it.
3. CI runs — lint, types, build, tests.
4. Merge PR → ephemeral resources auto-destroy.

### Staging (`<BASE_BRANCH>`)

1. Merge PR to `<BASE_BRANCH>` → push triggers deploy.
2. CI/deploy pipeline applies schema changes to the staging database.
3. Deploy platform deploys the staging environment.

### Production (`<PROD_BRANCH>`)

1. Open `<BASE_BRANCH>` → `<PROD_BRANCH>` release PR.
2. Approve + merge → push to `<PROD_BRANCH>`.
3. Deploy platform deploys to production.
4. Schema changes are applied to the production database.

---

## Adding a new env var

1. **Decide the scope:** local-only, build-time public (e.g. `NEXT_PUBLIC_*`), or runtime server-only.
2. **Add to `.env.example`** with a placeholder value + comment.
3. **Add to your type definitions** if using typed env (e.g. `env.d.ts`, `schema.ts`).
4. **Add to your local `.env.local`** with the real value.
5. **Add to the deploy platform** — choose the right scope (production, staging, preview).
6. **If it's a CI input:** `printf '%s' "$VALUE" | gh secret set NAME --repo <REPO_PATH>`.

---

## Adding a new CI secret

1. Pipe value via stdin:
   ```bash
   printf '%s' "$VALUE" | gh secret set NEW_SECRET_NAME --repo <REPO_PATH>
   ```
2. Reference in workflow YAML: `${{ secrets.NEW_SECRET_NAME }}`.
3. List repo secrets: `gh secret list --repo <REPO_PATH>`.

---

## Known gotchas

<!-- Fill during bootstrap. Common ones to consider: -->

1. **`gh secret set --body -` sets literal `"-"`.** Use stdin without `--body`, or `--body "$VALUE"` with the literal value.
2. **Workflow-only changes don't trigger a redeploy.** Deploy platforms only rebuild when app files change. Use an empty commit (`git commit --allow-empty`) to force a redeploy after env-var-only changes.
3. **Devcontainer rebuilds wipe temp files.** Don't store tokens or state in `/tmp` — use `.devcontainer/.env` (gitignored) or a mounted volume.
4. **Port collisions in worktrees.** Each worktree running a dev server needs a unique port. See [WORKTREES.md](WORKTREES.md).

---

## Cost summary

| Item | Monthly |
|---|---|
| <!-- Fill during bootstrap --> | |

---

## Related docs

- [README.md](README.md) — project overview, dev commands
- [WORKTREES.md](WORKTREES.md) — parallel worktree workflow
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR process, commit conventions
- [CLAUDE.md](CLAUDE.md) — Claude Code session instructions
