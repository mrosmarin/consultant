---
name: checkpoint
description: >
  Save full session state before a devcontainer refresh (or end of session) so the
  next session resumes exactly where this one left off. Runs the pre-commit hygiene
  loop on demand — updates memory-bank/*.md (activeContext.md + progress.md at minimum),
  syncs all docs (README, CLAUDE.md, CONTRIBUTING.md, per-feature docs), updates the
  relevant Linear tickets, then commits + pushes so state survives the refresh.
  Use when the user says "checkpoint", "save state", "update memory bank",
  "before refresh", "devcontainer refresh", "handoff", or "wrap up the session".
argument-hint: '[optional note about what to emphasize]'
user-invocable: true
---

# Checkpoint

Use this skill when the user wants to **persist the current session state** so a
devcontainer refresh (or a fresh session after a memory reset) can pick up exactly
where this one left off.

**Why this exists:** a devcontainer refresh wipes the local working tree. Anything not
**committed AND pushed** is lost — that includes memory-bank updates. So a checkpoint is
not done until the work is on the remote. This skill is the on-demand version of the
"Pre-commit hygiene order" in `CLAUDE.md`, with a guaranteed push at the end.

## Hard rules (do not violate)

- **Never touch `SCRATCHPAD.md`.** It's the user's file. Reading is fine; writing/editing/staging it is forbidden.
- **Never commit or push without an explicit "yes"** from the user. Stage, show the message + file list, then wait.
- **Never stage secrets.** `.devcontainer/.env` and any `.env*` files are gitignored — keep it that way. Do not print secret values into memory-bank, docs, or Linear.
- **Never push directly to `develop` or `main`.** If HEAD is on a protected branch, move to a feature/chore branch first (see Step 4).

## Procedure

### Step 0 — Orient (read before you write)

1. If you have not already this session, read `memory-bank/*.md` so your updates build on the latest committed state, not a guess.
2. Capture the live state:
   ```bash
   git branch --show-current
   git status --short
   git log --oneline -8
   git worktree list
   gh pr list --state open 2>/dev/null
   ```
3. Identify the ticket(s) worked this session and what concretely changed (code, schema, deploys, verifications). This is the raw material for Steps 1–3.

### Step 1 — Memory bank (`memory-bank/`)

Update so a cold-start reader understands current state without this conversation:

- **Always:** `activeContext.md` (current focus, recent changes, **next steps**, active decisions) and `progress.md` (what works, what's left, status, known issues).
- **As touched:** `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`.
- Convert relative dates to absolute (e.g. "today" → the real date).
- Lead `activeContext.md` with a dated banner for this checkpoint so the next session sees it first.
- Be precise and self-contained — after a reset this is the only link to this work.

### Step 2 — Docs (match code reality)

Update only what changed: `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, and any per-feature docs. If the session changed a workflow, runbook, or env requirement, the doc must reflect it.

### Step 3 — Linear (source of truth)

For each ticket worked this session:

- Post or update a comment summarizing what landed, what was delegated (name the receiving ticket), and verification results.
- Tick `- [x]` boxes only for items **actually verified** (see Ticket Close-Out in `CLAUDE.md`). Move state to Done only when every box is ticked and every gate has run.
- If new problems/scope surfaced this session, file new tickets and link them, so nothing lives only in chat.
- Record the **"next ticket up"** so resume is unambiguous.

### Step 4 — Branch guard

```bash
b=$(git branch --show-current)
```

- If `$b` is a `feature/*` or `chore/*` branch → stay on it.
- If `$b` is `develop` or `main` → create/switch to a checkpoint branch off current HEAD before staging:
  ```bash
  # Prefer a ticket id if this session has one (branch names lowercase):
  git checkout -b chore/dev-XXX-checkpoint
  # If there is genuinely no ticket, date-stamp it:
  git checkout -b chore/checkpoint-$(date +%Y%m%d)
  ```

### Step 5 — Stage, show, WAIT

```bash
git add memory-bank/ <changed docs...>   # NEVER `git add -A`; NEVER stage SCRATCHPAD.md or .env
git status --short
```

Show the user:
- the staged file list,
- the proposed commit message (conventional commits, subject after `type(scope):` **lowercase**), e.g.
  `chore(checkpoint): persist session state — <ticket/topic>`

Then **stop and wait for an explicit "yes."** Do not commit before it.

### Step 6 — Persist + confirm

On "yes":

```bash
git commit -m "chore(checkpoint): persist session state — <topic>"
git push -u origin HEAD
```

End commit messages with the standard footer (`🤖 Generated with Claude Code` + `Co-Authored-By` line).

Then print a **resume card** so the next session knows the entry point:

```
✅ Checkpoint pushed — safe to refresh
Branch:        <branch> @ <short-sha> (pushed to origin)
Active ticket: DEV-XXX — <title>  (state: ...)
Next up:       <next ticket / next step>
Re-add after refresh (.devcontainer/.env, gitignored — NOT in git):
  <list env var NAMES from .devcontainer/.env — never print values>
```

Tailor the env list to what this repo actually needs — read the gitignored `.devcontainer/.env` **keys** (names only, never values) to build it, since these are the credentials a refresh erases.

## Notes

- This is the same loop as `CLAUDE.md` → "Pre-commit hygiene order" (memory bank → docs → Linear → commit), run on demand and guaranteed to push.
- A checkpoint commit is docs/memory/Linear-only by design. If there is also uncommitted **code** in flight, surface it and let the user decide whether it belongs in this commit or its own.
- If a PR is the right vehicle (branch protection on `develop`/`main`), offer to open it after the push — don't merge without approval.

## Related

- `CLAUDE.md` — "Pre-commit hygiene order", "Ticket Close-Out", branching/environment strategy.
- `.claude/rules/memory-bank.md` — memory-bank structure and update workflow.
- `.devcontainer/SCRATCHPAD.md` — personal capture file (reading OK, never edit/stage).
