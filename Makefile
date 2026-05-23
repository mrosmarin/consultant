# Makefile — EndlessWorlds
#
# Run from the repo root. Targets cover local services, dev servers,
# quality gates, and worktree management.
#
# Quick reference:
#   make help               # list everything
#   make up                 # start Supabase + dev server
#   make down               # stop Supabase
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

# ─── Local services (Supabase) ───────────────────────────────────────
# One shared local Supabase stack (Postgres + Studio + Auth) run from the
# main checkout. Worktrees connect to it — don't start a second stack.
# Uses the project-local Supabase CLI (`pnpm supabase ...`).

.PHONY: services-start
services-start: ## Start the local Supabase stack
	pnpm supabase start

.PHONY: services-stop
services-stop: ## Stop the local Supabase stack
	pnpm supabase stop

.PHONY: services-status
services-status: ## Show Supabase status
	@pnpm supabase status 2>/dev/null || echo "(Supabase not running)"

.PHONY: services-restart
services-restart: ## Stop and restart Supabase
	$(MAKE) services-stop
	$(MAKE) services-start

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

# ─── Database / migrations (Supabase) ────────────────────────────────

.PHONY: db-reset
db-reset: ## Reset local DB (re-run migrations + seed)
	pnpm supabase db reset

.PHONY: db-migrate
db-migrate: ## Apply pending migrations to the local DB
	pnpm supabase migration up

.PHONY: db-migrate-new
db-migrate-new: ## Create a new migration: make db-migrate-new NAME=add_leads
	@if [[ -z "$(NAME)" ]]; then echo "Usage: make db-migrate-new NAME=<name>"; exit 2; fi
	pnpm supabase migration new $(NAME)

.PHONY: db-diff
db-diff: ## Diff live local DB against the migration set
	pnpm supabase db diff

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
claude-audit-verbose: ## Verbose audit with raw transcript matches
	bash scripts/claude-audit.sh --verbose

# ─── Daily shortcuts ─────────────────────────────────────────────────

.PHONY: up
up: ## Daily start: bring up Supabase + dev server
	$(MAKE) services-start
	$(MAKE) dev

.PHONY: down
down: ## Daily stop: stop Supabase (dev servers are foreground — Ctrl+C them)
	$(MAKE) services-stop
	@echo ""
	@echo "Tip: dev servers run in the foreground — stop them with Ctrl+C in their terminal."

.PHONY: status
status: ## Quick view: Supabase status + git status
	@echo "── Services ──"
	@$(MAKE) -s services-status || true
	@echo ""
	@echo "── Git status ──"
	@git status --short
