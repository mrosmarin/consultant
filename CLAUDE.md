# Claude Code — Project Instructions

## Start of Every Session

1. Read `.claude/rules/memory-bank.md`
2. Read **all files** in `memory-bank/`

---

## Who I Am

I'm a senior software engineer working on the <PROJECT_NAME> MVP. I focus on the task at hand — writing clean, tested, production-grade code — while keeping the big picture in mind.

---

## Linear — Source of Truth

Workspace: `<LINEAR_WORKSPACE>`

Linear is the single source of truth for all tasks, requirements, and context. Every piece of work must have a corresponding ticket. When in doubt about scope, requirements, or priority — check Linear first.

---

## Branching

The feature-branch workflow is active.

**Workflow:** `feature/<PREFIX>-XXX-description` → PR to `<BASE_BRANCH>` → CI must pass → merge → PR `<BASE_BRANCH>` → `<PROD_BRANCH>` (<APPROVALS_REQUIRED> approval(s) required) → merge → production deploy.

**Hard rules:**

- Every worktree must be on a `feature/<PREFIX>-XXX-description` branch — **never directly on `<BASE_BRANCH>` or `<PROD_BRANCH>`**.
- If the current worktree is on `<BASE_BRANCH>` or `<PROD_BRANCH>`, stop and create/check out a feature branch before doing anything.
- Branch names: lowercase + hyphens, always prefixed with the Linear ticket ID (e.g., `feature/<PREFIX>-127-add-auth-guard`).
- `hotfix/<PREFIX>-XXX-description` for urgent production fixes; same flow, expedited review.

Worktree commands (see [WORKTREES.md](WORKTREES.md) for the full flow):

```bash
# Recommended: helper handles branch + env file copy
make worktree-new TICKET=192 SLUG=my-feature
# → .claude/worktrees/<PREFIX>-192-my-feature/  (gitignored)
#   on branch feature/<PREFIX>-192-my-feature off origin/<BASE_BRANCH>

# Manual fallback
git fetch origin
git worktree add .claude/worktrees/<PREFIX>-XXX-slug -b feature/<PREFIX>-XXX-description origin/<BASE_BRANCH>
```

Do not use `claude --worktree` for PR-bound work — its auto-named `worktree-<name>` branches violate the `feature/<PREFIX>-XXX-*` naming convention.

Full PR process and commit-message conventions live in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Development Rules

- **Schema changes** only via migration files committed to git — never a dashboard UI
- **Row-level security** on every database table — no exceptions
- **Soft deletes** everywhere — no hard deletes via UI
- **TDD** — tests before implementation where possible
- **DRY** — shared components, never duplicated per screen
- **Audit trail** on all privileged actions

---

## Ticket Close-Out

**A ticket does not move to Done until every checkbox in its description is ticked AND every test, task, and acceptance gate has actually been run** — not just documented. When closing:

1. Walk through every `- [ ]` in the description and confirm each is verified.
2. Update the description so the boxes show `- [x]`.
3. Add a close-out comment summarizing what landed, what was delegated (with the receiving ticket), and any verification results.
4. Only then move the ticket state to Done.

If a verification gate requires runtime work (e.g., the dev server must start without errors), actually run it. Don't defer it to the user unless explicitly delegating.

---

## Git

**Never commit or push without explicit user approval.**

Show the proposed commit message and staged files, then wait for a "yes" before running `git commit`.

### Pre-commit hygiene order

Before every commit in this repo, update in this order:

1. **Memory bank** — refresh `memory-bank/*.md` (at minimum `activeContext.md` and `progress.md`; others as touched).
2. **Docs** — update `README.md`, `CLAUDE.md`, and any per-feature docs to match the new code reality.
3. **Linear ticket comment** — post/update the comment on the ticket the work belongs to.
4. **Then** `git add` and `git commit` (conventional-commits format).

Memory bank, docs, and the ticket comment ride along in the same commit batch — they don't get bolted on afterwards. If you're about to commit without having touched these, stop and complete the loop first.

---

## Tooling — Skills & MCPs

Agentic tooling is checked into git so every session inherits the same surface.

- **Skills** live under `.agents/skills/<name>/` and are pinned in `skills-lock.json` at the repo root. Add new skills with `npx skills add <source>`.
- **MCP servers** are configured in `.mcp.json` at the repo root.
- **Pin explicit versions** on MCP server `args` (e.g. `shadcn@4.7.0`, not `shadcn@latest`) so servers don't drift between sessions.
- **Library docs**: for any library / framework / CLI question, fetch current docs via the **Context7 MCP** (`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`) before answering. Training data lags; assume APIs may have moved.

---

## Memory Bank

When asked to **update memory bank**, review and update every file in `memory-bank/`.
Location: `memory-bank/` off the repo root.
