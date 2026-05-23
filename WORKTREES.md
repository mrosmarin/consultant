# Worktrees — Parallel Feature Branches

Worktrees let you run multiple Claude Code (or shell) sessions side-by-side, each on its own feature branch, sharing the same git history. No stashing, no branch switching.

## Why this approach

The Claude Code CLI ships a `--worktree` flag that auto-creates worktrees, but the branches it generates are named `worktree-<name>` — those don't match the `feature/dev-XXX-description` convention. So we use plain `git worktree add` and a small helper that:

1. enforces the `feature/dev-XXX-<slug>` naming convention (lowercase prefix),
2. branches off `origin/develop` (the only valid base for feature work),
3. creates the worktree under `.claude/worktrees/` (gitignored) so the workspace stays inside the repo,
4. copies gitignored files listed in [`.worktreeinclude`](.worktreeinclude) so services work in the new worktree without manual setup,
5. assigns a **deterministic, non-conflicting Next.js dev port** derived from the ticket number.

## Create a worktree

```bash
make worktree-new TICKET=192 SLUG=my-feature
```

This calls [`scripts/worktree-new.sh`](scripts/worktree-new.sh) and produces:

```
.claude/worktrees/dev-192-my-feature/               ← new working dir (nested in repo, gitignored)
    branch: feature/dev-192-my-feature              ← off origin/develop
    env files copied
    dev port: 3192                                  ← 3000 + (ticket % 1000)
```

After it runs:

```bash
cd .claude/worktrees/dev-192-my-feature
pnpm install                  # each worktree needs its own dependencies
claude                        # start Claude Code in the worktree
```

Each worktree needs its own dependency install because dependency directories are gitignored. pnpm installs are fast — its content-addressable store means most files are hardlinks.

## Ports — avoid collisions across worktrees

Worktrees run in parallel, so dev servers must not share a port. The helper assigns each worktree a deterministic Next.js port: **`3000 + (ticket % 1000)`** (e.g. `DEV-192` → `3192`, `DEV-1234` → `3234`). If `apps/web/.env.local` exists in the worktree, the script writes `PORT=<port>` into it; otherwise it prints the port to use.

```bash
# main checkout — default port
make dev                       # → http://localhost:3000

# worktree for DEV-192 — its assigned port
cd .claude/worktrees/dev-192-...
PORT=3192 pnpm dev             # → http://localhost:3192
```

## Shared Supabase stack (don't duplicate)

The local Supabase stack (`supabase start`) binds fixed ports (`54321` API / `54322` DB / `54323` Studio) and is **shared** — start it **once from the main checkout**. Every worktree connects to the same instance via the `apps/web/.env.local` copied at creation time. Migrations are shared through git, so a single stack is correct.

**Do not** run `supabase start` from inside a worktree — it will collide on the Supabase ports. If a worktree genuinely needs an isolated DB (rare), run a second stack with a custom `project_id` and offset ports in its `supabase/config.toml`.

## Git hooks

Git hooks (Husky, lefthook, etc.) fire automatically inside worktrees. Worktrees share the main checkout's `.git/hooks` via the pointer file in `.git`, so no extra setup is needed.

## VS Code

Each worktree can be its own VS Code window:

```bash
code .claude/worktrees/dev-123-my-feature
```

The devcontainer config travels with the checkout, so VS Code will offer to reopen in container.

## Inspect what's open

```bash
make worktree-list           # all worktrees on this repo
git worktree list            # same thing
```

## Cleanup

After your PR merges:

```bash
git worktree remove .claude/worktrees/dev-123-my-feature
git branch -D feature/dev-123-my-feature
```

If a worktree directory was deleted manually, sweep the stale entry:

```bash
make worktree-prune
```

## Caveats

- **Don't use `claude --worktree`** for PR-bound work — auto-named branches won't follow the `feature/dev-XXX-*` convention. Use `make worktree-new` instead.
- **`.worktreeinclude` files don't auto-sync.** The helper copies once at creation. If you rotate keys or change config, recopy manually or recreate the worktree.
- **Lockfile churn.** Avoid running installs with mismatched flags across worktrees — keep the lockfile consistent. CI is the source of truth.
- **`.claude/worktrees/` is gitignored.** Worktree files live inside the repo but are never tracked, so `git add .` from the main checkout won't sweep them in.