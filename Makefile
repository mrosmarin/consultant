# Makefile — <PROJECT_NAME>
#
# Run from the repo root. Targets cover local services, dev servers,
# quality gates, and worktree management.
#
# Quick reference:
#   make help               # list everything
#   make up                 # start local services + dev server
#   make down               # stop local services
#   make ci                 # reproduce CI locally
#   make claude-audit       # audit Claude Code permission settings

SHELL := /bin/bash

# ── Configuration ─────────────────────────────────────────────────────
# Adjust these to match your project layout.
APP_ROOT        := <APP_ROOT>
# If monorepo with multiple apps, add per-app paths here:
# APP_ONE       := $(APP_ROOT)/apps/app-one
# APP_TWO       := $(APP_ROOT)/apps/app-two
# ──────────────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

# ─── Help ─────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@echo ""
	@echo "<PROJECT_NAME> — make targets"
	@echo "──────────────────────────────────────"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── Install / clean ─────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies
	<INSTALL_CMD>

.PHONY: install-hooks
install-hooks: ## Re-install git hooks (Husky, lefthook, etc.)
	# <INSTALL_HOOKS_CMD>  ← e.g. pnpm exec husky

.PHONY: clean
clean: ## Remove caches and build artifacts (keeps dependencies)
	# <CLEAN_CMD>  ← e.g. find . -type d \( -name ".turbo" -o -name ".next" -o -name "dist" \) -prune -exec rm -rf {} +

.PHONY: clean-all
clean-all: ## Remove caches AND dependencies (forces full reinstall)
	$(MAKE) clean
	# <CLEAN_ALL_CMD>  ← e.g. find . -type d -name "node_modules" -prune -exec rm -rf {} +

# ─── Local services ──────────────────────────────────────────────────
# Adapt these targets to your database / Docker Compose / local infra.
# For monorepos with per-app services, add per-app targets like:
#   services-start-app-one, services-start-app-two, etc.

.PHONY: services-start
services-start: ## Start local services (database, cache, etc.)
	# <SERVICES_START_CMD>  ← e.g. docker compose up -d
	#                       ← e.g. cd apps/myapp && npx supabase start

.PHONY: services-stop
services-stop: ## Stop local services
	# <SERVICES_STOP_CMD>  ← e.g. docker compose down

.PHONY: services-status
services-status: ## Show local service status
	# <SERVICES_STATUS_CMD>  ← e.g. docker compose ps
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "(no containers running)"

.PHONY: services-restart
services-restart: ## Stop and restart local services
	$(MAKE) services-stop
	$(MAKE) services-start

# ─── Dev servers ─────────────────────────────────────────────────────

.PHONY: dev
dev: ## Run dev server
	<DEV_CMD>

# For monorepos with multiple apps, add per-app targets:
# .PHONY: dev-app-one
# dev-app-one: ## Run dev server for app-one only (http://localhost:<DEV_PORT>)
# 	cd $(APP_ROOT) && <PACKAGE_MANAGER> turbo dev --filter=app-one

# ─── Build / quality gates ───────────────────────────────────────────

.PHONY: build
build: ## Production build
	# <BUILD_CMD>  ← e.g. cd $(APP_ROOT) && pnpm turbo build

.PHONY: check-types
check-types: ## Static type check
	# <CHECK_TYPES_CMD>  ← e.g. cd $(APP_ROOT) && pnpm turbo check-types

.PHONY: lint
lint: ## Run linter
	# <LINT_CMD>  ← e.g. cd $(APP_ROOT) && pnpm turbo lint

.PHONY: format
format: ## Auto-format all files
	# <FORMAT_CMD>  ← e.g. pnpm exec prettier --write .

.PHONY: format-check
format-check: ## Check formatting without writing
	# <FORMAT_CHECK_CMD>  ← e.g. pnpm exec prettier --check .

.PHONY: test
test: ## Run test suite
	# <TEST_CMD>  ← e.g. cd $(APP_ROOT) && pnpm turbo test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	# <TEST_WATCH_CMD>  ← e.g. cd $(APP_ROOT) && pnpm turbo test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	# <TEST_COVERAGE_CMD>  ← e.g. cd $(APP_ROOT) && pnpm turbo test:coverage

.PHONY: test-e2e
test-e2e: ## Run E2E tests
	# <TEST_E2E_CMD>  ← e.g. cd $(APP_ROOT) && pnpm test:e2e

.PHONY: audit
audit: ## Dependency vulnerability audit
	# <AUDIT_CMD>  ← e.g. pnpm audit --audit-level=high --prod

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

# ─── Database / migrations ───────────────────────────────────────────
# Adapt to your database tooling (Supabase, Prisma, Drizzle, etc.)

.PHONY: db-reset
db-reset: ## Reset local database (re-run migrations + seed)
	# <DB_RESET_CMD>  ← e.g. cd apps/myapp && npx supabase db reset
	#                 ← e.g. npx prisma migrate reset

.PHONY: db-migrate
db-migrate: ## Apply pending migrations
	# <DB_MIGRATE_CMD>  ← e.g. npx prisma migrate deploy

.PHONY: db-seed
db-seed: ## Seed database with dev data
	# <DB_SEED_CMD>

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
up: ## Daily start: bring up local services + dev server
	$(MAKE) services-start
	$(MAKE) dev

.PHONY: down
down: ## Daily stop: stop local services (dev servers are foreground — Ctrl+C them)
	$(MAKE) services-stop
	@echo ""
	@echo "Tip: dev servers run in the foreground — stop them with Ctrl+C in their terminal."

.PHONY: status
status: ## Quick view: local services + git status
	@echo "── Services ──"
	@$(MAKE) -s services-status || true
	@echo ""
	@echo "── Git status ──"
	@git status --short