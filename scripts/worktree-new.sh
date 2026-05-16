#!/usr/bin/env bash
#
# scripts/worktree-new.sh — create a feature-branch worktree.
#
# Usage:
#   scripts/worktree-new.sh <ticket> <slug>
#   scripts/worktree-new.sh 192 worktree-workflow
#
# Creates a worktree at .claude/worktrees/nob-<ticket>-<slug>/
# (nested inside the repo, gitignored) on branch
# feature/nob-<ticket>-<slug> off origin/qa, and copies the gitignored
# .env.local files so Supabase works immediately.
#
# Branch protection requires feature/nob-XXX-* names; this script
# enforces that convention and is the canonical way to spin up a new
# worktree in this repo. See WORKTREES.md.

set -euo pipefail

if [[ $# -ne 2 ]]; then
  cat >&2 <<EOF
Usage: $0 <ticket> <slug>
Example: $0 192 worktree-workflow

  ticket  Linear NOB ticket number (digits only; "nob-" prefix is stripped)
  slug    short kebab-case description (lowercase letters, digits, hyphens)
EOF
  exit 2
fi

TICKET_RAW="$1"
SLUG="$2"

# Normalise ticket: strip optional "nob-"/"NOB-" prefix, lowercase
TICKET="${TICKET_RAW#nob-}"
TICKET="${TICKET#NOB-}"
TICKET="$(printf '%s' "$TICKET" | tr '[:upper:]' '[:lower:]')"

if [[ ! "$TICKET" =~ ^[0-9]+$ ]]; then
  echo "Error: ticket must be a number (got: $TICKET_RAW)" >&2
  exit 2
fi
if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]] && [[ ! "$SLUG" =~ ^[a-z0-9]$ ]]; then
  echo "Error: slug must be lowercase letters/digits/hyphens, no leading/trailing hyphen (got: $SLUG)" >&2
  exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Error: must run from inside the Git repository" >&2
  exit 1
}

BRANCH="feature/nob-${TICKET}-${SLUG}"
WORKTREE_DIR="${REPO_ROOT}/.claude/worktrees/nob-${TICKET}-${SLUG}"

# Refuse if branch already exists locally
if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "Error: branch ${BRANCH} already exists locally" >&2
  exit 1
fi

echo "→ Fetching origin..."
git -C "$REPO_ROOT" fetch origin --quiet

# Refuse if branch already exists on origin
if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/remotes/origin/${BRANCH}"; then
  echo "Error: branch ${BRANCH} already exists on origin — pick a new slug or check it out instead" >&2
  exit 1
fi

# Refuse if origin/qa is missing
if ! git -C "$REPO_ROOT" show-ref --verify --quiet "refs/remotes/origin/qa"; then
  echo "Error: origin/qa not found — fetch origin first" >&2
  exit 1
fi

# Refuse if worktree path already exists
if [[ -e "$WORKTREE_DIR" ]]; then
  echo "Error: worktree path already exists: $WORKTREE_DIR" >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/.claude/worktrees"

echo "→ Creating worktree:"
echo "    path:   $WORKTREE_DIR"
echo "    branch: $BRANCH (from origin/qa)"
git -C "$REPO_ROOT" worktree add "$WORKTREE_DIR" -b "$BRANCH" origin/qa

# Copy gitignored .env.local files so Supabase can connect right away
ENV_FILES=(
  "relo-apps/apps/nobodymove/.env.local"
  "relo-apps/apps/central/.env.local"
)

echo "→ Copying .env.local files..."
for f in "${ENV_FILES[@]}"; do
  src="${REPO_ROOT}/${f}"
  dst="${WORKTREE_DIR}/${f}"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "    [ok] $f"
  else
    echo "    [skip] $f (not present in main checkout)"
  fi
done

REL_PATH=".claude/worktrees/nob-${TICKET}-${SLUG}"

cat <<EOF

Worktree ready at ${REL_PATH}/

Next:
  cd ${REL_PATH}
  (cd relo-apps && pnpm install)   # each worktree needs its own node_modules
  claude                            # start Claude Code in the worktree

Run dev on a non-default PORT if another worktree's already on 3000/3001:
  cd relo-apps && PORT=3010 pnpm dev

Cleanup after the PR merges:
  git worktree remove ${REL_PATH}
  git branch -D ${BRANCH}
EOF
