#!/usr/bin/env bash
#
# scripts/worktree-new.sh — create a feature-branch worktree.
#
# Usage:
#   scripts/worktree-new.sh <ticket> <slug>
#   scripts/worktree-new.sh 123 my-feature
#
# Creates a worktree at .claude/worktrees/dev-<ticket>-<slug>/
# (nested inside the repo, gitignored) on branch
# feature/dev-<ticket>-<slug> off origin/develop, and copies
# gitignored files listed in .worktreeinclude so local services work
# immediately.
#
# Branch naming convention requires feature/dev-XXX-* names; this
# script enforces that and is the canonical way to spin up a new
# worktree in this repo. See WORKTREES.md.

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────
TICKET_PREFIX="dev"            # Linear ticket prefix (lowercased for branches)
BASE_BRANCH="develop"          # feature branches fork from origin/develop
DEV_PORT_BASE=3000             # Next.js base port; worktree port = base + (ticket % 1000)
# ──────────────────────────────────────────────────────────────────────

if [[ $# -ne 2 ]]; then
  cat >&2 <<EOF
Usage: $0 <ticket> <slug>
Example: $0 123 my-feature

  ticket  Linear ticket number (digits only; "${TICKET_PREFIX}-" prefix is stripped)
  slug    short kebab-case description (lowercase letters, digits, hyphens)
EOF
  exit 2
fi

TICKET_RAW="$1"
SLUG="$2"

PREFIX_LOWER="$(printf '%s' "$TICKET_PREFIX" | tr '[:upper:]' '[:lower:]')"
PREFIX_UPPER="$(printf '%s' "$TICKET_PREFIX" | tr '[:lower:]' '[:upper:]')"

# Normalise ticket: strip optional prefix (case-insensitive), lowercase
TICKET="${TICKET_RAW#${PREFIX_LOWER}-}"
TICKET="${TICKET#${PREFIX_UPPER}-}"
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

BRANCH="feature/${PREFIX_LOWER}-${TICKET}-${SLUG}"
WORKTREE_DIR="${REPO_ROOT}/.claude/worktrees/${PREFIX_LOWER}-${TICKET}-${SLUG}"

# Deterministic, non-conflicting Next.js dev port: base + (ticket % 1000)
# 10# forces base-10 so tickets with leading zeros aren't read as octal.
WORKTREE_PORT=$(( DEV_PORT_BASE + (10#${TICKET} % 1000) ))

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

# Refuse if base branch is missing
if ! git -C "$REPO_ROOT" show-ref --verify --quiet "refs/remotes/origin/${BASE_BRANCH}"; then
  echo "Error: origin/${BASE_BRANCH} not found — fetch origin first" >&2
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
echo "    branch: $BRANCH (from origin/${BASE_BRANCH})"
git -C "$REPO_ROOT" worktree add "$WORKTREE_DIR" -b "$BRANCH" "origin/${BASE_BRANCH}"

# Copy gitignored files listed in .worktreeinclude
INCLUDE_FILE="${REPO_ROOT}/.worktreeinclude"

if [[ -f "$INCLUDE_FILE" ]]; then
  echo "→ Copying files from .worktreeinclude..."

  while IFS= read -r pattern || [[ -n "$pattern" ]]; do
    # Skip blank lines and comments
    [[ -z "$pattern" || "$pattern" =~ ^[[:space:]]*# ]] && continue

    # Expand globs relative to repo root
    shopt -s nullglob globstar
    matches=( ${REPO_ROOT}/${pattern} )
    shopt -u nullglob globstar

    if [[ ${#matches[@]} -eq 0 ]]; then
      echo "    [skip] $pattern (no matches in main checkout)"
      continue
    fi

    for src in "${matches[@]}"; do
      # Get path relative to repo root
      rel="${src#${REPO_ROOT}/}"
      # A non-glob literal (e.g. ".env.local") isn't removed by nullglob,
      # so skip entries that don't actually exist instead of failing.
      if [[ ! -e "$src" ]]; then
        echo "    [skip] $rel (not present in main checkout)"
        continue
      fi
      dst="${WORKTREE_DIR}/${rel}"
      mkdir -p "$(dirname "$dst")"
      cp "$src" "$dst"
      echo "    [ok] $rel"
    done
  done < "$INCLUDE_FILE"
else
  echo "→ No .worktreeinclude found — skipping file copy"
fi

# Assign a non-conflicting Next.js dev port for this worktree.
# If apps/web/.env.local exists, set/replace PORT in it; otherwise just report it.
WEB_ENV="${WORKTREE_DIR}/apps/web/.env.local"
if [[ -f "$WEB_ENV" ]]; then
  if grep -q '^PORT=' "$WEB_ENV"; then
    sed -i.bak "s/^PORT=.*/PORT=${WORKTREE_PORT}/" "$WEB_ENV" && rm -f "${WEB_ENV}.bak"
  else
    printf '\nPORT=%s\n' "$WORKTREE_PORT" >> "$WEB_ENV"
  fi
  echo "→ Set PORT=${WORKTREE_PORT} in apps/web/.env.local"
else
  echo "→ Assigned dev port ${WORKTREE_PORT} (apps/web/.env.local not present yet — use it manually)"
fi

REL_PATH=".claude/worktrees/${PREFIX_LOWER}-${TICKET}-${SLUG}"

cat <<EOF

Worktree ready at ${REL_PATH}/

Next:
  cd ${REL_PATH}
  pnpm install                      # each worktree needs its own dependencies
  claude                            # start Claude Code in the worktree

Dev server (port is reserved for this worktree to avoid collisions):
  PORT=${WORKTREE_PORT} pnpm dev    # → http://localhost:${WORKTREE_PORT}

Database: Neon (cloud) — set DATABASE_URL in apps/web/.env.local; there is no local DB to start.

Cleanup after the PR merges:
  git worktree remove ${REL_PATH}
  git branch -D ${BRANCH}
EOF