# Deployment & Environments

Reference for the full deploy pipeline: every environment, every secret, where each one lives, and how to rotate them.

If you're adding a feature that needs a new env var or rotating a leaked credential, this is the doc.

---

## TL;DR

| Git branch | Deploy target (Vercel) | Scope | Migration / schema application |
|---|---|---|---|
| `main` | Production | Production | `drizzle-kit migrate` against the prod Neon branch |
| `develop` | Preview (staging) | Preview | `drizzle-kit migrate` against the staging Neon branch |
| `feature/dev-XXX-*` PR | Preview | Preview | optional per-PR Neon branch |
| `localhost` | Local dev (devcontainer) | n/a | `make db-migrate` against a Neon dev branch |

---

## Environments

### 1. Local (devcontainer)

**What:** All development runs inside a **devcontainer with VS Code and Docker-in-Docker**. The database is **Neon** (serverless, cloud) — there is **no local DB container**. Local dev connects to a **Neon dev branch** over the network.

**Where keys live:** `apps/web/.env.local` (gitignored). Copy `apps/web/.env.example` and fill `DATABASE_URL` / `DATABASE_URL_UNPOOLED` from the Neon dashboard (Connection Details) or the Vercel↔Neon integration.

**Setup:**
```bash
# VS Code will prompt to reopen in devcontainer, or:
# Command Palette → "Dev Containers: Reopen in Container"

pnpm install
# set apps/web/.env.local (DATABASE_URL from a Neon dev branch)
make dev       # dev server only — Neon is cloud, nothing local to boot
```

**Ports:** Next.js dev server defaults to `3000`. When running multiple worktrees concurrently, each worktree gets a per-worktree Next.js `PORT` (base `3000` + ticket offset) — assigned by `make worktree-new`. There is no local DB port to share; point each worktree's `DATABASE_URL` at a Neon branch (a shared dev branch, or its own). See [WORKTREES.md](WORKTREES.md).

### 2. Preview / PR

**What:** When a PR is opened against `develop`:
- Vercel builds + deploys a preview URL automatically (Git integration).
- The preview points at the **staging Neon branch**, or a **per-PR Neon branch** if configured (Neon branching pairs with Vercel previews).
- On merge: the preview deployment is retained per Vercel's retention settings; an ephemeral Neon branch can be auto-deleted.

### 3. Staging (`develop`)

**What:**
- The `develop` branch is the staging environment. All feature PRs target `develop` first.
- Pushes to `develop` auto-deploy a Vercel preview/staging build.
- Schema changes are applied to the **staging Neon branch** (`drizzle-kit migrate` with the staging `DATABASE_URL_UNPOOLED`).

### 4. Production (`main`)

**What:**
- The `main` branch is production. PRs come only from `develop`. No required approvals (solo); CI green when enabled.
- Vercel deploys production on push to `main`.
- Schema changes are applied to the **production Neon branch** (`drizzle-kit migrate` with the prod `DATABASE_URL_UNPOOLED`).

---

## Secret inventory

### Local devcontainer env vars (gitignored)

The devcontainer auto-loads env vars from `.devcontainer/.env` (via `docker-compose.yml` `env_file`). These are inputs to CLI tooling and MCP servers — **not** app runtime vars.

| Env var | Purpose | Source |
|---|---|---|
| `LINEAR_API_KEY` | Linear MCP server auth | Linear → Settings → API → Personal API keys |
| `CONTEXT7_TOKEN` | Context7 MCP docs lookups | context7.com account |
| `GITHUB_TOKEN` | GitHub MCP / `gh` auth | GitHub → Developer settings → tokens |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub MCP (classic PAT) | GitHub → Developer settings → tokens |
| `VERCEL_TOKEN` | Vercel MCP / CLI deploys | Vercel → Account Settings → Tokens |

**Regeneration policy:**
- API tokens: rotate every ~90 days or immediately if compromised.
- Neon connection strings / Neon Auth secrets: rotate via the Neon dashboard if leaked.
- Project IDs / branch names: never change unless a project/branch is recreated.

### App env vars (Vercel + local)

| Var | Production | Staging (`develop`) | Preview | Source |
|---|---|---|---|---|
| `DATABASE_URL` | prod pooled | staging pooled | branch pooled | Neon → Connection Details (**pooled**) |
| `DATABASE_URL_UNPOOLED` | prod direct | staging direct | branch direct | Neon → Connection Details (**direct**; migrations) |
| `NEON_AUTH_BASE_URL` | prod | staging | preview | Neon Auth setup |
| `NEON_AUTH_COOKIE_SECRET` | prod | staging | preview | generated, ≥32 chars (server-only) |

**Where to inspect:** Vercel dashboard → project → Settings → Environment Variables. Locally, `apps/web/.env.local`. The Vercel↔Neon integration can set `DATABASE_URL*` automatically per environment.

### CI secrets / variables (GitHub repo)

Set at repository scope (Settings → Secrets and variables → Actions).

| Name | Kind | Used by | Purpose |
|---|---|---|---|
| `RUN_CI` | **Variable** | All workflows | Kill-switch — set `false` to skip CI while over Actions quota; `true` to re-enable. **Currently `false`.** |
| `NEON_AUTH_BASE_URL` | Secret | `ci.yml` build | Required at build time — Neon Auth validates it at module load |
| `NEON_AUTH_COOKIE_SECRET` | Secret | `ci.yml` build | Required at build time (Neon Auth cookie secret) |
| `DATABASE_URL` | Secret | `ci.yml` build | Neon pooled connection used during `next build` |
| `DATABASE_URL_UNPOOLED` | Secret | migration steps | Neon direct connection for `drizzle-kit migrate` in CI (if/when migrations run in CI) |

> The three build secrets must be set **before flipping `RUN_CI=true`**, or the build job fails on missing Neon Auth env. While `RUN_CI=false`, jobs skip and the secrets aren't needed.

**To set or rotate a secret:**
```bash
# Pipe value via stdin so it never appears in process listings
printf '%s' "$VALUE" | gh secret set SECRET_NAME --repo mrosmarin/consultant
```
**To set the kill-switch variable:**
```bash
gh variable set RUN_CI --body false --repo mrosmarin/consultant
```

> ⚠️ **Gotcha:** `gh secret set NAME --body -` sets the literal string `"-"`, not stdin. Omit `--body` to read from stdin, or use `--body "$VALUE"` with the actual value.

---

## How the migration / schema pipeline works

Migrations are **Drizzle** SQL files generated from `apps/web/src/db/schema.ts` and committed to `apps/web/drizzle/`.

### Local

```bash
# Generate a migration from schema changes
pnpm --filter web db:generate          # make db-generate

# Apply pending migrations to the DATABASE_URL target
pnpm --filter web db:migrate           # make db-migrate

# Push schema directly to the DB (dev/prototyping only — no migration file)
pnpm --filter web db:push              # make db-push
```

### PR flow

1. Open PR → Vercel builds a preview (optionally against a per-PR Neon branch).
2. CI runs — lint, types, build, tests (when `RUN_CI=true`).
3. Migrations are reviewed as committed SQL files; nothing is applied automatically on PRs by default.

### Staging (`develop`)

1. Merge PR to `develop` → Vercel deploys staging.
2. Apply migrations to the staging Neon branch: `drizzle-kit migrate` with the staging `DATABASE_URL_UNPOOLED`.

### Production (`main`)

1. Open `develop` → `main` release PR.
2. Merge → push to `main`.
3. Vercel deploys production.
4. Apply migrations to the production Neon branch: `drizzle-kit migrate` with the prod `DATABASE_URL_UNPOOLED`.

---

## Adding a new env var

1. **Decide the scope:** local-only, build-time public (`NEXT_PUBLIC_*`), or runtime server-only.
2. **Add to `apps/web/.env.example`** with a placeholder value + comment.
3. **Add to typed env** if using typed env (e.g. `env.ts` / a zod schema).
4. **Add to `apps/web/.env.local`** with the real value.
5. **Add to Vercel** — choose the right scope (Production / Preview).
6. **If it's a CI input:** `printf '%s' "$VALUE" | gh secret set NAME --repo mrosmarin/consultant`.

---

## Adding a new CI secret

1. Pipe value via stdin:
   ```bash
   printf '%s' "$VALUE" | gh secret set NEW_SECRET_NAME --repo mrosmarin/consultant
   ```
2. Reference in workflow YAML: `${{ secrets.NEW_SECRET_NAME }}`.
3. List repo secrets: `gh secret list --repo mrosmarin/consultant`.

---

## Known gotchas

1. **`gh secret set --body -` sets literal `"-"`.** Use stdin without `--body`, or `--body "$VALUE"` with the literal value.
2. **Workflow-only changes don't trigger a Vercel redeploy.** Vercel only rebuilds when app files change. Use an empty commit (`git commit --allow-empty`) to force a redeploy after env-var-only changes.
3. **Devcontainer rebuilds wipe temp files.** Don't store tokens or state in `/tmp` — use `.devcontainer/.env` (gitignored) or a mounted volume.
4. **Port collisions in worktrees.** Each worktree's Next.js dev server needs a unique port — `make worktree-new` assigns one. The DB is Neon (cloud), so there's no local DB port to collide; point each worktree's `DATABASE_URL` at a Neon branch. See [WORKTREES.md](WORKTREES.md).
5. **Server-only secrets.** `DATABASE_URL*` and `NEON_AUTH_COOKIE_SECRET` are server-only — never expose them with a `NEXT_PUBLIC_` prefix. Use the **pooled** `DATABASE_URL` in the app and the **unpooled** one for migrations.
6. **Neon Auth is Beta + AWS-only.** Built on Better Auth 1.4.18; incompatible with Neon IP Allow / Private Networking. Re-evaluate before relying on it for sensitive portal data.

---

## Cost summary

| Item | Plan | Monthly |
|---|---|---|
| Vercel | Hobby (free) to start | $0 |
| Neon | Free tier to start | $0 |
| Neon Auth | Free up to 60K MAU | $0 |
| GitHub Actions | Free minutes — **currently over quota** (resets ~June 2026) | $0 (CI gated off via `RUN_CI`) |

---

## Related docs

- [README.md](README.md) — project overview, dev commands
- [WORKTREES.md](WORKTREES.md) — parallel worktree workflow
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR process, commit conventions
- [CLAUDE.md](CLAUDE.md) — Claude Code session instructions
