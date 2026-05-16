# Worktrees — Parallel Feature Branches

Worktrees let you run multiple Claude Code (or shell) sessions side-by-side, each on its own feature branch, sharing the same git history. No stashing, no branch switching.

## Why this approach

The Claude Code CLI ships a `--worktree` flag that auto-creates worktrees, but the branches it generates are named `worktree-<name>` — those don't match the `feature/<PREFIX>-XXX-description` convention and may be rejected by branch protection rules. So we use plain `git worktree add` and a small helper that:

1. enforces the `feature/<PREFIX>-XXX-<slug>` naming convention,
2. branches off `origin/<BASE_BRANCH>` (the only valid base for feature work),
3. creates the worktree under `.claude/worktrees/` (gitignored) so the workspace stays inside the repo,
4. copies gitignored config files (<ENV_FILES>) so services work in the new worktree without manual setup.

## Create a worktree

```bash
make worktree-new TICKET=192 SLUG=my-feature
```

This calls [`scripts/worktree-new.sh`](scripts/worktree-new.sh) and produces:

```
.claude/worktrees/<PREFIX>-192-my-feature/               ← new working dir (nested in repo, gitignored)
    branch: feature/<PREFIX>-192-my-feature              ← off origin/<BASE_BRANCH>
    env files copied
```

After it runs:

```bash
cd .claude/worktrees/<PREFIX>-192-my-feature
<INSTALL_CMD>                 # each worktree needs its own dependencies
claude                        # start Claude Code in the worktree
```

Each worktree needs its own dependency install because dependency directories are gitignored. If you use pnpm, installs are fast — its content-addressable store means most files are hardlinks.

## Run multiple sessions

Use different ports per worktree if dev servers run concurrently:

```bash
# main checkout — keep defaults
make dev

# worktree 1 — bump port
cd .claude/worktrees/<PREFIX>-123-...
PORT=<DEV_PORT>1 <DEV_CMD>

# worktree 2 — bump again
cd .claude/worktrees/<PREFIX>-456-...
PORT=<DEV_PORT>2 <DEV_CMD>
```

## Shared services (databases, containers, etc.)

If your project runs local services (e.g. a database in Docker), start them once from the **main checkout**. Every worktree can connect to the same instance using the env files copied at creation time.

Don't start duplicate service instances from inside a worktree — they'll collide on the same ports.

## Git hooks

Git hooks (Husky, lefthook, etc.) fire automatically inside worktrees. Worktrees share the main checkout's `.git/hooks` via the pointer file in `.git`, so no extra setup is needed.

## VS Code

Each worktree can be its own VS Code window:

```bash
code .claude/worktrees/<PREFIX>-123-my-feature
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
git worktree remove .claude/worktrees/<PREFIX>-123-my-feature
git branch -D feature/<PREFIX>-123-my-feature
```

If a worktree directory was deleted manually, sweep the stale entry:

```bash
make worktree-prune
```

## Caveats

- **Don't use `claude --worktree`** for PR-bound work — auto-named branches won't follow the `feature/<PREFIX>-XXX-*` convention. Use `make worktree-new` instead.
- **Env file updates don't sync.** The helper copies once at creation. If you rotate keys or change config, recopy manually or recreate the worktree.
- **Lockfile churn.** Avoid running installs with mismatched flags across worktrees — keep the lockfile consistent. CI is the source of truth.
- **`.claude/worktrees/` is gitignored.** Worktree files live inside the repo but are never tracked, so `git add .` from the main checkout won't sweep them in.
