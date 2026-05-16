# Makefile — Nobodymove (relo-apps) workspace
#
# Run from the repo root. Targets cover Supabase lifecycle (per-app + all),
# Next.js dev/build, and quality gates.
#
# Quick reference:
#   make help               # list everything
#   make up                 # start Supabase for both apps + open dev servers
#   make down               # stop dev servers + Supabase for both apps
#   make supabase-status    # show what's running

SHELL := /bin/bash

RELO_APPS       := relo-apps
NOBODYMOVE_APP  := $(RELO_APPS)/apps/nobodymove
CENTRAL_APP     := $(RELO_APPS)/apps/central
SUPABASE        := npx --yes supabase

.DEFAULT_GOAL := help

# ─── Help ────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@echo ""
	@echo "Nobodymove (relo-apps) — make targets"
	@echo "──────────────────────────────────────"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── Install / clean ─────────────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies (workspace-root tooling + monorepo)
	pnpm install
	cd $(RELO_APPS) && pnpm install

.PHONY: install-hooks
install-hooks: ## Re-install Husky git hooks (also runs automatically via `make install`)
	pnpm exec husky

.PHONY: clean
clean: ## Remove turbo caches and build artifacts (keeps node_modules)
	cd $(RELO_APPS) && pnpm turbo run clean 2>/dev/null || true
	find $(RELO_APPS) -type d \( -name ".turbo" -o -name ".next" -o -name "dist" \) -prune -exec rm -rf {} +

.PHONY: clean-all
clean-all: ## Remove caches AND node_modules (forces full reinstall)
	$(MAKE) clean
	find $(RELO_APPS) -type d -name "node_modules" -prune -exec rm -rf {} +

# ─── Supabase — per-app ──────────────────────────────────────────────────────

.PHONY: supabase-start-nobodymove
supabase-start-nobodymove: ## Start local Supabase stack for nobodymove (ports 54321-54327)
	cd $(NOBODYMOVE_APP) && $(SUPABASE) start

.PHONY: supabase-stop-nobodymove
supabase-stop-nobodymove: ## Stop local Supabase stack for nobodymove
	cd $(NOBODYMOVE_APP) && $(SUPABASE) stop

.PHONY: supabase-status-nobodymove
supabase-status-nobodymove: ## Show local Supabase status for nobodymove
	cd $(NOBODYMOVE_APP) && $(SUPABASE) status

.PHONY: supabase-reset-nobodymove
supabase-reset-nobodymove: ## Reset nobodymove local DB (re-runs migrations + seed)
	cd $(NOBODYMOVE_APP) && $(SUPABASE) db reset

.PHONY: seed-dev-users
seed-dev-users: ## Seed the 6 local @nobodymove.dev dev users (needs local Supabase running)
	cd $(NOBODYMOVE_APP) && bash supabase/scripts/seed-dev-users.sh

.PHONY: seed-staging-users
seed-staging-users: ## Seed/rotate the 12 Rob+Mitch staging accounts in nobody-qa. Usage: make seed-staging-users STAGING_USER_PASSWORD=xxx (needs SUPABASE_ACCESS_TOKEN)
	@test -n "$(STAGING_USER_PASSWORD)" || { echo "ERROR: pass STAGING_USER_PASSWORD (from Bitwarden) — e.g. make seed-staging-users STAGING_USER_PASSWORD=xxx"; exit 1; }
	cd $(NOBODYMOVE_APP) && \
	  QA_REF=rddalidftwmntnnuqplj && \
	  STAGING_SUPABASE_URL="https://$$QA_REF.supabase.co" \
	  STAGING_SUPABASE_SERVICE_KEY="$$(curl -s -H "Authorization: Bearer $$SUPABASE_ACCESS_TOKEN" "https://api.supabase.com/v1/projects/$$QA_REF/api-keys?reveal=true" | python3 -c "import sys,json; print(next(k['api_key'] for k in json.load(sys.stdin) if k['name']=='service_role'))")" \
	  STAGING_USER_PASSWORD="$(STAGING_USER_PASSWORD)" \
	  bash supabase/scripts/seed-staging-users.sh

.PHONY: supabase-start-central
supabase-start-central: ## Start local Supabase stack for central (ports 54331-54337)
	cd $(CENTRAL_APP) && $(SUPABASE) start

.PHONY: supabase-stop-central
supabase-stop-central: ## Stop local Supabase stack for central
	cd $(CENTRAL_APP) && $(SUPABASE) stop

.PHONY: supabase-status-central
supabase-status-central: ## Show local Supabase status for central
	cd $(CENTRAL_APP) && $(SUPABASE) status

.PHONY: supabase-reset-central
supabase-reset-central: ## Reset central local DB (re-runs migrations + seed)
	cd $(CENTRAL_APP) && $(SUPABASE) db reset

# ─── Supabase — both apps ────────────────────────────────────────────────────

.PHONY: supabase-start
supabase-start: ## Start local Supabase for BOTH apps
	$(MAKE) supabase-start-nobodymove
	$(MAKE) supabase-start-central

.PHONY: supabase-stop
supabase-stop: ## Stop local Supabase for BOTH apps
	$(MAKE) supabase-stop-nobodymove
	$(MAKE) supabase-stop-central

.PHONY: supabase-status
supabase-status: ## Show local Supabase status for BOTH apps
	@echo "── nobodymove ──"
	@$(MAKE) -s supabase-status-nobodymove || true
	@echo ""
	@echo "── central ──"
	@$(MAKE) -s supabase-status-central || true

.PHONY: supabase-restart
supabase-restart: ## Stop and restart Supabase for BOTH apps
	$(MAKE) supabase-stop
	$(MAKE) supabase-start

.PHONY: supabase-ps
supabase-ps: ## docker ps view of all running supabase containers
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -i supabase || echo "(no supabase containers running)"

# ─── Dev servers ─────────────────────────────────────────────────────────────

.PHONY: dev
dev: ## Run dev servers for both apps (pnpm turbo dev)
	cd $(RELO_APPS) && pnpm dev

.PHONY: dev-nobodymove
dev-nobodymove: ## Run dev server for nobodymove only (http://localhost:3001)
	cd $(RELO_APPS) && pnpm turbo dev --filter=nobodymove

.PHONY: dev-central
dev-central: ## Run dev server for central only (http://localhost:3000)
	cd $(RELO_APPS) && pnpm turbo dev --filter=central

# ─── Build / quality gates ───────────────────────────────────────────────────

.PHONY: build
build: ## Production build for all workspaces
	cd $(RELO_APPS) && pnpm turbo build

.PHONY: build-nobodymove
build-nobodymove: ## Production build for nobodymove only
	cd $(RELO_APPS) && pnpm turbo build --filter=nobodymove

.PHONY: build-central
build-central: ## Production build for central only
	cd $(RELO_APPS) && pnpm turbo build --filter=central

.PHONY: check-types
check-types: ## Run tsc --noEmit across all workspaces
	cd $(RELO_APPS) && pnpm turbo check-types

.PHONY: lint
lint: ## ESLint across all workspaces
	cd $(RELO_APPS) && pnpm turbo lint

.PHONY: format
format: ## Prettier write across all workspaces
	cd $(RELO_APPS) && pnpm turbo format

.PHONY: test
test: ## Vitest run across all workspaces
	cd $(RELO_APPS) && pnpm turbo test

.PHONY: test-watch
test-watch: ## Vitest --watch across all workspaces
	cd $(RELO_APPS) && pnpm turbo test:watch

.PHONY: audit
audit: ## Dependency CVE gate (NOB-243) — pnpm audit --audit-level=high --prod at both install tiers
	pnpm audit --audit-level=high --prod
	cd $(RELO_APPS) && pnpm audit --audit-level=high --prod

.PHONY: semgrep
semgrep: ## Static analysis gate (NOB-244) — Semgrep against curated rule packs, ERROR severity only
	semgrep scan \
		--config=p/owasp-top-ten \
		--config=p/security-audit \
		--config=p/typescript \
		--config=p/react \
		--config=p/nextjs \
		--severity=ERROR \
		--error \
		--metrics=off

.PHONY: ci
ci: ## Reproduce CI locally — audit, semgrep, prettier --check, lint, check-types, build, test
	$(MAKE) audit
	$(MAKE) semgrep
	pnpm exec prettier --check .
	$(MAKE) lint
	$(MAKE) check-types
	$(MAKE) build
	$(MAKE) test

# ─── Worktrees (parallel feature branches) ───────────────────────────────────

.PHONY: worktree-new
worktree-new: ## Create a feature worktree: NOB=192 SLUG=worktree-workflow
	@if [[ -z "$(NOB)" || -z "$(SLUG)" ]]; then \
		echo "Usage: make worktree-new NOB=<ticket> SLUG=<slug>"; \
		echo "Example: make worktree-new NOB=192 SLUG=worktree-workflow"; \
		exit 2; \
	fi
	./scripts/worktree-new.sh $(NOB) $(SLUG)

.PHONY: worktree-list
worktree-list: ## List all worktrees attached to this repo
	@git worktree list

.PHONY: worktree-prune
worktree-prune: ## Sweep stale worktree records (after manual rm of a worktree dir)
	@git worktree prune --verbose

# ─── Daily shortcuts ─────────────────────────────────────────────────────────

.PHONY: up
up: ## Daily start: bring up Supabase for both apps, then run dev servers
	$(MAKE) supabase-start
	$(MAKE) dev

.PHONY: down
down: ## Daily stop: stop Supabase for both apps (dev servers are foreground — Ctrl+C them)
	$(MAKE) supabase-stop
	@echo ""
	@echo "Tip: dev servers run in the foreground — stop them with Ctrl+C in their terminal."

.PHONY: status
status: ## Quick view: Supabase containers + git status
	@echo "── Supabase containers ──"
	@$(MAKE) -s supabase-ps
	@echo ""
	@echo "── Git status ──"
	@git status --short
