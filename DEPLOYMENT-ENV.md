# Deployment & Environments

Reference for the full deploy pipeline: every environment, every secret, where each one lives, and how to rotate them.

If you're adding a feature that needs a new env var or rotating a leaked credential, this is the doc.

---

## TL;DR

| Git branch | Deploy target (Vercel) | Scope | Migration / schema application |
|---|---|---|---|
| `main` | Production | Production | Apply via Supabase CLI/CI against the prod project |
| `develop` | Preview (staging) | Preview | Apply against the staging Supabase project |
| `feature/dev-XXX-*` PR | Preview | Preview | n/a (uses staging or a branch DB if configured) |
| `localhost` | Local dev (devcontainer) | n/a | `make db-reset` / `supabase db reset` |

---

## Environments

### 1. Local (devcontainer)

**What:** All development runs inside a **devcontainer with VS Code and Docker-in-Docker**. The local Supabase stack (Postgres + Studio + Auth) runs as Docker containers via the **Supabase CLI**.

**Where keys live:** `apps/web/.env.local` (gitignored). Populated from `supabase start` output or from `apps/web/.env.example`.

**Setup:**
```bash
# VS Code will prompt to reopen in devcontainer, or:
# Command Palette → "Dev Containers: Reopen in Container"

pnpm install
make up        # supabase start + dev server
```

**Ports:** Next.js dev server defaults to `3000`. The local Supabase stack uses `54321` (API), `54322` (DB), `54323` (Studio). When running multiple worktrees concurrently, each worktree gets a per-worktree Next.js `PORT` (base `3000` + ticket offset) — assigned by `make worktree-new`. The Supabase stack is **shared** — start it once from the main checkout; all worktrees connect to it. See [WORKTREES.md](WORKTREES.md).

### 2. Preview / PR

**What:** When a PR is opened against `develop`:
- Vercel builds + deploys a preview URL automatically (Git integration).
- The preview points at the **staging Supabase project** unless a per-branch DB is configured.
- On merge: the preview deployment is retained per Vercel's retention settings.

### 3. Staging (`develop`)

**What:**
- The `develop` branch is the staging environment. All feature PRs target `develop` first.
- Pushes to `develop` auto-deploy a Vercel preview/staging build.
- Schema changes are applied to the staging Supabase project (`supabase db push` against the staging project ref).

### 4. Production (`main`)

**What:**
- The `main` branch is production. PRs come only from `develop`. No required approvals (solo); CI green when enabled.
- Vercel deploys production on push to `main`.
- Schema changes are applied to the production Supabase project (`supabase db push` against the prod project ref).

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
- Supabase keys: rotate via the Supabase dashboard if leaked.
- Project IDs/refs: never change unless a project is recreated.

### App env vars (Vercel + local)

| Var | Production | Staging (`develop`) | Preview | Source |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | staging project URL | staging | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon key | staging anon key | staging | Supabase dashboard → API |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service role | staging service role | staging | Supabase dashboard → API (server-only, never `NEXT_PUBLIC_*`) |

**Where to inspect:** Vercel dashboard → project → Settings → Environment Variables. Locally, `apps/web/.env.local`.

### CI secrets / variables (GitHub repo)

Set at repository scope (Settings → Secrets and variables → Actions).

| Name | Kind | Used by | Purpose |
|---|---|---|---|
| `RUN_CI` | **Variable** | All workflows | Kill-switch — set `false` to skip CI while over Actions quota; `true` to re-enable |
| `SUPABASE_ACCESS_TOKEN` | Secret | migration steps | Supabase CLI auth in CI (if/when migrations run in CI) |

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

### Local

```bash
# Create a new migration
supabase migration new <name>          # make db-migrate-new NAME=<name>

# Reset local DB (re-run all migrations + seed)
supabase db reset                      # make db-reset

# Diff live local DB against migration set
supabase db diff                       # make db-diff
```

### PR flow

1. Open PR → Vercel builds a preview.
2. CI runs — lint, types, build, tests (when `RUN_CI=true`).
3. Migrations are reviewed as committed SQL files; nothing is applied automatically on PRs by default.

### Staging (`develop`)

1. Merge PR to `develop` → Vercel deploys staging.
2. Apply migrations to the staging Supabase project: `supabase db push --project-ref <staging-ref>`.

### Production (`main`)

1. Open `develop` → `main` release PR.
2. Merge → push to `main`.
3. Vercel deploys production.
4. Apply migrations to the production Supabase project: `supabase db push --project-ref <prod-ref>`.

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
4. **Port collisions in worktrees.** Each worktree's Next.js dev server needs a unique port — `make worktree-new` assigns one. Don't boot a second Supabase stack per worktree; share the one from the main checkout. See [WORKTREES.md](WORKTREES.md).
5. **`SUPABASE_SERVICE_ROLE_KEY` is server-only.** Never expose it with a `NEXT_PUBLIC_` prefix — it bypasses RLS.

---

## Cost summary

| Item | Plan | Monthly |
|---|---|---|
| Vercel | Hobby (free) to start | $0 |
| Supabase | Free tier to start | $0 |
| GitHub Actions | Free minutes — **currently over quota** (resets ~June 2026) | $0 (CI gated off via `RUN_CI`) |

---

## Related docs

- [README.md](README.md) — project overview, dev commands
- [WORKTREES.md](WORKTREES.md) — parallel worktree workflow
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR process, commit conventions
- [CLAUDE.md](CLAUDE.md) — Claude Code session instructions
