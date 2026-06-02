# Makefile — EndlessWorlds
#
# Run from the repo root. Targets cover local services, dev servers,
# quality gates, and worktree management.
#
# Quick reference:
#   make help               # list everything
#   make up                 # run the dev server (Neon is cloud — nothing local to boot)
#   make db-generate        # generate a Drizzle migration
#   make ci                 # reproduce CI locally
#   make claude-audit       # audit Claude Code permission settings

SHELL := /bin/bash

# ── Configuration ─────────────────────────────────────────────────────
# pnpm + Turborepo monorepo. The web app lives at apps/web.
WEB := apps/web
# ──────────────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

# ─── Help ─────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@echo ""
	@echo "EndlessWorlds — make targets"
	@echo "──────────────────────────────────────"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── Install / clean ─────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies
	pnpm install

.PHONY: clean
clean: ## Remove caches and build artifacts (keeps dependencies)
	find . -type d \( -name ".turbo" -o -name ".next" -o -name "dist" \) -prune -exec rm -rf {} +

.PHONY: clean-all
clean-all: ## Remove caches AND dependencies (forces full reinstall)
	$(MAKE) clean
	find . -type d -name "node_modules" -prune -exec rm -rf {} +

# ─── Local services ──────────────────────────────────────────────────
# The database is Neon (serverless, cloud) — there is no local stack to
# start. Local dev connects to a Neon dev branch via DATABASE_URL in
# apps/web/.env.local. See DEPLOYMENT-ENV.md.

# ─── Dev servers ─────────────────────────────────────────────────────

.PHONY: dev
dev: ## Run the dev server (http://localhost:3000)
	pnpm turbo dev

# ─── Build / quality gates ───────────────────────────────────────────

.PHONY: build
build: ## Production build
	pnpm turbo build

.PHONY: check-types
check-types: ## Static type check
	pnpm turbo check-types

.PHONY: lint
lint: ## Run linter
	pnpm turbo lint

.PHONY: format
format: ## Auto-format all files
	pnpm exec prettier --write .

.PHONY: format-check
format-check: ## Check formatting without writing
	pnpm exec prettier --check .

.PHONY: test
test: ## Run unit tests (Vitest)
	pnpm turbo test

.PHONY: test-watch
test-watch: ## Run unit tests in watch mode
	pnpm --filter web test:watch

.PHONY: test-coverage
test-coverage: ## Run unit tests with coverage
	pnpm --filter web test:coverage

.PHONY: test-e2e
test-e2e: ## Run E2E tests (Playwright)
	pnpm --filter web test:e2e

.PHONY: audit
audit: ## Dependency vulnerability audit
	pnpm audit --audit-level=high --prod

.PHONY: ci
ci: ## Reproduce CI locally — full quality gate
	@echo "→ Format check"
	$(MAKE) format-check
	@echo "→ Lint"
	$(MAKE) lint
	@echo "→ Type check"
	$(MAKE) check-types
	@echo "→ Build"
	$(MAKE) build
	@echo "→ Test"
	$(MAKE) test
	@echo "✓ CI gate passed"

# ─── Database / migrations (Drizzle + Neon) ──────────────────────────
# Requires apps/web/.env.local with DATABASE_URL / DATABASE_URL_UNPOOLED.

.PHONY: db-generate
db-generate: ## Generate a migration from schema changes
	pnpm --filter web db:generate

.PHONY: db-migrate
db-migrate: ## Apply pending migrations to the database
	pnpm --filter web db:migrate

.PHONY: db-push
db-push: ## Push schema directly to the DB (dev/prototyping only)
	pnpm --filter web db:push

.PHONY: db-studio
db-studio: ## Open Drizzle Studio
	pnpm --filter web db:studio

.PHONY: db-reset-staging
db-reset-staging: ## Wipe STAGING/QA app data (timesheets, invoices, leads) for a clean e2e test — keeps schema + allowlist; never touches prod
	@set -a; [ -f .devcontainer/.env ] && . ./.devcontainer/.env; set +a; \
	cd apps/web && node scripts/reset-staging-db.mjs

# ─── Worktrees (parallel feature branches) ───────────────────────────

.PHONY: worktree-new
worktree-new: ## Create a feature worktree: make worktree-new TICKET=123 SLUG=my-feature
	@if [[ -z "$(TICKET)" || -z "$(SLUG)" ]]; then \
		echo "Usage: make worktree-new TICKET=<ticket> SLUG=<slug>"; \
		echo "Example: make worktree-new TICKET=192 SLUG=my-feature"; \
		exit 2; \
	fi
	./scripts/worktree-new.sh $(TICKET) $(SLUG)

.PHONY: worktree-list
worktree-list: ## List all worktrees attached to this repo
	@git worktree list

.PHONY: worktree-prune
worktree-prune: ## Sweep stale worktree records (after manual rm of a worktree dir)
	@git worktree prune --verbose

# ─── Claude Code ─────────────────────────────────────────────────────

.PHONY: claude-audit
claude-audit: ## Audit Claude Code permission settings and suggest improvements
	bash scripts/claude-audit.sh

.PHONY: claude-audit-global
claude-audit-global: ## Audit global Claude Code settings
	bash scripts/claude-audit.sh --global

.PHONY: claude-audit-verbose
claude-audit-verbose: ## Audit + list every command Claude has run
	bash scripts/claude-audit.sh --verbose

.PHONY: claude-fix
claude-fix: ## Audit, then interactively add prompt-driving commands to allow list (live + postinstall)
	bash scripts/claude-audit.sh --fix

.PHONY: claude-fix-all
claude-fix-all: ## Like claude-fix but also adds common coverage-gap commands
	bash scripts/claude-audit.sh --fix-all

.PHONY: claude-fix-yes
claude-fix-yes: ## Same as claude-fix but applies without prompting
	bash scripts/claude-audit.sh --fix --yes

.PHONY: postinstall
postinstall: ## Re-run the devcontainer postinstall (reinstall tools + refresh Claude settings)
	bash .devcontainer/postinstall.sh

.PHONY: claude-settings-reset
claude-settings-reset: ## Rewrite global Claude Code settings from postinstall (fixes stale volume copy)
	@echo "→ Rewriting ~/.claude/settings.json from the template's postinstall block..."
	@awk '/cat > ~\/.claude\/settings.json << .SETTINGS./{f=1; next} /^SETTINGS$$/{f=0} f' \
		.devcontainer/postinstall.sh > ~/.claude/settings.json
	@echo "✓ Global Claude settings reset. Restart Claude Code to apply."
	@echo "  Review with: make claude-audit"

.PHONY: claude-clear-approvals
claude-clear-approvals: ## Clear accumulated per-project 'always allow' entries in ~/.claude.json
	@if [[ -f ~/.claude.json ]]; then \
		jq '(.projects // {}) |= map_values(.allowedTools = [])' ~/.claude.json > /tmp/claude.json \
			&& mv /tmp/claude.json ~/.claude.json \
			&& echo "✓ Cleared accumulated approvals. Restart Claude Code."; \
	else \
		echo "~/.claude.json not found — nothing to clear."; \
	fi


# ─── Daily shortcuts ─────────────────────────────────────────────────

.PHONY: up
up: ## Daily start: run the dev server (DB is Neon/cloud — nothing local to boot)
	$(MAKE) dev

.PHONY: down
down: ## Daily stop (dev servers are foreground — Ctrl+C them)
	@echo "Dev servers run in the foreground — stop them with Ctrl+C in their terminal."
	@echo "The database is Neon (cloud) — nothing local to stop."

.PHONY: status
status: ## Quick view: git status
	@git status --short
