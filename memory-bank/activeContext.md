# Active Context

_Last updated: 2026-05-29_

> **CHECKPOINT 2026-05-29 (pre devcontainer rebuild).** Everything below is merged to `develop` + pushed, and **`develop` is now fully released to `main` (PR #34) — `develop` and `main` are identical (`cf7f8ba`), zero divergence.** Prod + isolated staging/QA are live. Local git cleaned up: all merged feature branches deleted, stale remote refs pruned. **Resume at: M3 remaining — insights/blog (DEV-59/66) or copy polish (DEV-63/64).** See "Next steps". After rebuild, re-add `.devcontainer/.env` (keys listed in the resume card).

## Current focus

**Prod fully live; isolated staging/QA env live; deepening the portal (companies/billing) + finishing M3.**
- **Production:** https://endlessworlds.xyz (custom domain, SSL, www→apex) — public site + secure portal (auth + allowlist, dashboard, timesheets, invoicing), SEO, GA4 (`G-G830M5YF0W`, consent-gated).
- **Staging/QA:** https://staging.endlessworlds.xyz — dedicated Neon project, fully isolated (data **and** auth), resettable via `make db-reset-staging` (wipes login + data). `noindex`.
- **In flight (portal):** DEV-101 company/client entity + onboarding (timesheets/invoices now hang off a company; both billing models), DEV-102 auth UX (password reveal/policy/confirm). Then accrual (DEV-103), company docs (DEV-104), Drive/PDF (DEV-105).
- **Remaining M3:** copy polish (DEV-63/64), insights/blog (DEV-59/66).

## Environments

- **Production** — `main` → `endlessworlds.xyz` (+ `endlessworlds-web.vercel.app`). Neon project `dry-darkness-00977469` (`production` branch) + its Neon Auth. Indexable. GA4 active.
- **Staging/QA** — `develop` → `staging.endlessworlds.xyz`. **Dedicated Neon project `EndlessWorlds.Staging` = `winter-dew-93819743`** (own DB **and** own Neon Auth) → logins + data fully isolated from prod. Wired via `develop`-branch-scoped Vercel env (`DATABASE_URL`/`_UNPOOLED`/`NEON_AUTH_BASE_URL`/`NEON_AUTH_COOKIE_SECRET`). `noindex`; Vercel SSO/deploy-protection OFF (so all previews are public). Reset: `make db-reset-staging`.
- **PR previews** (non-`develop`) — prod project's `preview` Neon branch (shares prod auth). Only `develop`/staging gets the isolated project.
- **DNS:** registrar **Hover**, Hover nameservers. Vercel hosts the records.
- **`develop` and `main` are in sync** (`cf7f8ba`) — DEV-99 (noindex), DEV-81 (staging tooling), DEV-100 (checkpoint skill) shipped to prod via PR #34 (2026-05-29), then `main` back-merged into `develop`. Next release: branch a `feature/dev-XXX-*` off `develop` → PR to `develop` → when ready, PR `develop`→`main`.

## Recent changes (newest first; deduped at the 2026-05-29 checkpoint)

- **DEV-108 (invoice form: company-first + auto-fill):** The "New invoice" form now leads with the **Company** picker; selecting one **auto-fills** number/amount/dates/notes (from the latest completed period), all editable. **Saving marks the underlying unbilled hours billed** for hourly companies (so they can't be double-billed) — the form is now an editable "Generate". Extracted a shared **`src/lib/invoicing.ts` `buildInvoiceDraft(company, userId)`** used by the Generate button, the form prefill, and `createInvoice` so they can't drift. No new migration (uses 0005). Gates green; **faithful round-trip PASSED on dev** (page embeds ACME-0001/$750 prefill; form create → invoice + both entries billed). (PR pending.)
- **DEV-107 (timesheet UX):** Company picker on the timesheet form is now a controlled field, so it **stays selected after "Log time"** (React 19 resets uncontrolled form fields after a server action). Date/hours/notes still clear for the next entry. Gates green. (PR pending.)
- **DEV-103 (invoice prefix + generate-invoice engine):** Migration `0005` — `companies.invoice_prefix`, `time_entries.billed_at`/`billed_invoice_id`. Company onboarding/edit now has an **invoice prefix** (auto-suggested from name, editable). **"Generate invoice"** button (companies list row + edit page) → `generateInvoice` action creates a **draft** invoice for the latest completed billing period (`src/lib/billing.ts` `latestCompletedPeriod`, unit-checked): hourly = sum of unbilled entries up to period end × rate (entries stamped `billed_at`/`billed_invoice_id` so they can't be re-billed); retainer = flat amount. Numbers = `{PREFIX}-{seq}` (count incl. soft-deleted +1). Invoices list shows the period/source note. Gates green; **faithful generate round-trip PASSED on dev** (ACME-0001 = $750 for 5h@$150, both entries billed, 2nd generate adds nothing). `0005` applied to **dev + staging** (Neon API path). Future auto-generation → Neon **pg_cron** calling the same generator. (PR pending.)
- **DEV-106 (portal server actions broken by auth middleware — FIX):** Onboarding (and every portal mutation) failed in the browser with *"An unexpected response was received from the server"* and **no Vercel error log**. Root cause: `src/proxy.ts` (`auth.middleware`) 307-redirected the server-action **POST** to `/auth/sign-in`; React's action dispatcher can't parse the redirect → throws. Fix: middleware guards **GET** only; non-GET passes through (`NextResponse.next()`), actions self-guard via `getSession()`. Verified on dev: faithful no-JS action POST → 200 + company row created; unauthed GET `/account/*` still 307→sign-in; gates green. Latent since DEV-85 (portal actions were only DB-script-verified, never browser-submitted). See `systemPatterns.md`. **Also: migration `0004` was applied to staging (Neon API path) on 2026-05-29 — staging reads work.** (fix; PR pending.)
- **DEV-101 (client/company entity + onboarding):** New `companies` table (migration `0004`, RLS + `companies_all` policy, soft-delete, owner-scoped) with billing config — `billing_type` hourly|retainer, `hourly_rate`/`retainer_amount`, `billing_frequency` weekly|biweekly|semimonthly|monthly, `billing_anchor_day`. Onboarding UI at `/account/companies` (list + form) + `/account/companies/[id]/edit`; **Companies** in portal nav + dashboard count/quick-action. `time_entries` + `invoices` migrated to `company_id` (FK; legacy free-text `client` now nullable + display fallback); both forms pick a company. Time entries gained `start_time`/`end_time` (hours auto-derive from the span). Gates green; live Neon round-trip PASSED on the **dev** branch (migration applied to dev only — staging/prod apply is a separate deploy step, like 0000–0003). Picker shared via `src/lib/companies.ts`. (PR #?, In Progress.)
- **DEV-102 (auth UX):** Accessible `PasswordInput` reveal toggle (sign-in + sign-up), confirm-password field on registration (server validates match), length-first password policy `src/lib/auth/password.ts` (min 12, screens common/weak — stricter than Better Auth's default 8). Gates green. (PR #36, In Progress.)
- **New tickets from portal testing (2026-05-29):** DEV-101 (company entity, ↑), DEV-102 (auth UX, ↑), **DEV-103** invoice accrual from billing period + timesheets (blocked by 101), **DEV-104** company document storage (blocked by 101), **DEV-105** Google Drive sync + PDF export (blocked by 101, ↔ DEV-76).
- **Release + git cleanup (2026-05-29):** Shipped `develop`→`main` via **PR #34** (noindex DEV-99, staging/QA DEV-81, checkpoint skill DEV-100, checkpoint state) — all prod-behavior-neutral; `main` back-merged into `develop` so both are identical at `cf7f8ba`. Cleaned local git: deleted 8 merged feature branches (all verified against merged PRs #20/#22/#24/#25/#27/#28/#29/#30), pruned stale `: gone` remote refs. Only `develop` + `main` remain.
- **DEV-81 (isolated staging/QA — separate Neon project):** Replaced branch-based staging (which shared prod's Neon Auth) with a dedicated Neon project `EndlessWorlds.Staging` (`winter-dew-93819743`): created it, ran migrations 0000–0003 + allowlist seed, enabled Neon Auth via API (`POST /projects/{id}/branches/{br}/auth`, `better_auth`), generated a cookie secret, repointed `develop`-scoped Vercel env at it, added its trusted domain, deleted the orphaned prod-project `staging` branch. `make db-reset-staging` (+ `apps/web/scripts/reset-staging-db.mjs`) wipes `neon_auth` users/sessions **and** app data, hard-guarded to the staging project by name. Verified live. (PR #28; DEV-81 still In Progress — pre-launch walkthrough remains.)
- **DEV-100 (checkpoint skill):** `.agents/skills/checkpoint/SKILL.md` — on-demand memory-bank→docs→Linear→commit+push. (PR #29, Done.)
- **DEV-99 (noindex non-prod):** `isProd = VERCEL_ENV === "production"` in `src/lib/site.ts`; `robots.ts` → `Disallow: /` and `metadata.robots` → `noindex,nofollow` on non-prod. Verified live on staging; prod indexable. (PR #27, Done.)
- **DEV-82 (custom domain):** `endlessworlds.xyz` LIVE (Hover; moved NS off an inaccessible AWS Route 53 zone → Hover NS; apex A → Vercel; www→apex 308; fixed a backwards apex→www redirect; `NEXT_PUBLIC_SITE_URL` flipped to the custom domain). Neon Auth trusted domains updated. (In Progress — email DNS/SPF, GSC sitemap, monitoring remain.)
- **DEV-67 (Analytics → GA4):** Pivoted off Vercel Web Analytics (cost). GA4 via `@next/third-parties` behind a cookie-consent banner (`src/components/site-analytics.tsx`, `useSyncExternalStore`; GA + cookies only after Accept). `sendGAEvent("contact_lead")` on contact success. **Live:** `NEXT_PUBLIC_GA_ID=G-G830M5YF0W` set on prod + redeployed; ID confirmed in the prod bundle. (Done.)
- **DEV-98 (portal access allowlist + sign-in link):** `allowed_emails` table (RLS + `allowed_emails_all` policy; migration `0003`; seeded `mrosmarin@gmail.com`). `isEmailAllowed()` (`src/lib/auth/allowlist.ts`) enforced in sign-up + sign-in actions. Sign-in links in header + footer. Shipped to prod (PR #25/#26). Fixed a live "Invalid origin" blocker by adding prod origin to Neon Auth trusted domains. Caveat: raw `/api/auth/[...path]` not gated (follow-up). (Done.)
- **DEV-65 (SEO foundation):** Metadata API (title template, `metadataBase`, OG/Twitter, canonicals), JSON-LD `@graph`, `sitemap.ts` + `robots.ts`, branded `opengraph-image`. Site config `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`). Shipped to prod (PR #21). (Done.)
- **Prod ship + Neon isolation (DEV-88):** M4+M5 promoted to prod (PR #18). Neon `preview` branch for PR previews. Linear board reconciled (18 superseded backlog tickets → Duplicate). (Done.)
- **DEV-95/96/97 (M4/M5 portal):** portal shell + dashboard; timesheets (`time_entries`); invoicing (`invoices`) — all RLS, soft-delete, scoped per user; dashboard "Hours this week" + "Open invoices" wired to live queries. (Done.)
- **DEV-83→94:** bootstrap; monorepo + Next 16 (DEV-84); Neon + Neon Auth + Drizzle (DEV-85); Tailwind v4 + shadcn + dark (DEV-86); CI gated on `RUN_CI=false` (DEV-87); brand/IA `docs/brand-and-ia.md` (DEV-89); public pages Home/Services/About/Work/Contact (DEV-90–94, lead form → Neon). Insights still a stub.

> Next.js 16 has breaking changes vs older docs — consult `node_modules/next/dist/docs/` before writing Next.js code (`apps/web/AGENTS.md`).

## Next steps (resume here)

> All work in a worktree (`make worktree-new TICKET=… SLUG=…`) → PR to `develop`. Never edit the root checkout. (See memory `feedback_worktree_flow`.)

1. **Portal — company/billing depth (in flight):** land **DEV-101** (company entity, PR open) + **DEV-102** (auth UX, PR #36); then **DEV-103** accrual (hours×rate / retainer over billing period), **DEV-104** company doc storage, **DEV-105** Drive sync + PDF (↔ DEV-76). Apply migration `0004` to staging/prod at deploy time (manual, like 0000–0003).
2. **M3 finish:** **DEV-59** insights/blog section (still a stub) + **DEV-66** seed articles; **DEV-63/64** copy polish; **DEV-65/SEO** Core Web Vitals → **DEV-80**.
3. **Portal depth:** **DEV-71** utilities showcase; **DEV-69** RBAC roles; **DEV-72** profile/account settings.
4. **Invoicing depth (deferred):** **DEV-76** invoice PDF/email; **DEV-77** Stripe.
4. **Launch (M6):** **DEV-82** finish (email DNS SPF/DKIM/DMARC, submit sitemap to Google Search Console, uptime/error monitoring); **DEV-78/79/80** cross-browser/a11y, security audit, perf.
5. **Testing gap:** Vitest/Playwright installed but **no real test suites yet** — CI test step still commented out.
6. When ready: **ship `develop`→`main`** to push noindex + staging tooling to prod (behavior-neutral).

## Open questions / decisions

- **Public sign-up hardening:** allowlist is enforced in the app actions only; the raw Neon Auth `/api/auth/[...path]` endpoint isn't gated — lock it down at the Neon Auth/Better Auth layer if it matters.
- **RBAC role model** (admin vs client/team) — not yet designed (DEV-69).
- **Stripe/payments** — deferred (DEV-77).
- Neon Auth is **Beta + AWS-only** — acceptable for MVP.

## Important preferences

- **Never commit/push without explicit user approval**; show staged files + message first.
- **All committed work goes through a worktree branch → PR → `develop`** — no "small tooling/skill" exceptions; keep the root checkout clean.
- Pre-commit hygiene order: memory bank → docs → Linear → commit (+ push). The `/checkpoint` skill runs this on demand.
- Monorepo preferred even for a single app. Soft deletes + RLS on every table.
