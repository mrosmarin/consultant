# Invoicing Platform Roadmap

> **Linear is the source of truth.** This doc mirrors the milestone/ticket structure for at-a-glance repo context. Project: **EndlessWorlds Website build** (team `Devopolis`, prefix `DEV`). Last synced: 2026-05-30.

The public site + secure portal are **live in production** at https://endlessworlds.xyz. Milestones **M1–M6** covered launch (foundation → public site → SEO → auth/portal → timesheets/invoicing → QA/launch). The portal's **company/client + invoicing core** shipped in the M5 timeframe:

- Companies/clients with billing config (hourly | retainer, rate/retainer, frequency, anchor, invoice prefix) — DEV-101
- Timesheets (per company, start/end time, billed flag) + invoices (per company, statuses, auto-numbered) — DEV-95/96/97/101
- Generate-invoice from the billing period + double-bill guard; company-first auto-fill invoice form — DEV-103/108
- Auth UX (reveal/confirm/strength) — DEV-102; portal server-action auth fix — DEV-106; sticky timesheet company — DEV-107

**M7–M13 below** build that core into a full consulting invoicing platform.

---

## Capability → status map

Legend: ✅ shipped · 🟡 partial · ⬜ not started

| Area | Capability | Status | Where |
|---|---|---|---|
| **Client & Project** | Client DB w/ contacts, billing address, terms | 🟡 | company has address + 1 contact + frequency; terms→DEV-111, contacts→DEV-110 |
| | Projects/engagements linked to clients | ⬜ | DEV-109 |
| | Multiple contacts per client | ⬜ | DEV-110 |
| **Time & Expense** | Time by project/task/activity | 🟡 | by company today; DEV-114 |
| | Rate per client/project/consultant | 🟡 | per client today; DEV-113 |
| | Billable vs non-billable | ⬜ | DEV-112 |
| | Expense logging + receipts | ⬜ | DEV-123 (+ DEV-104) |
| | Mileage & reimbursables | ⬜ | DEV-124 |
| **Invoice Creation** | Generate from time/expenses or manual | ✅/🟡 | time+manual done; expenses→DEV-123 |
| | Branded templates w/ logo | ⬜ | DEV-76 |
| | **Line items** | ⬜ | **DEV-115 (keystone)** |
| | Fixed-fee / hourly / retainer / milestone | 🟡 | hourly+retainer done; DEV-119 |
| | Auto-numbering | ✅ | DEV-103 (`{PREFIX}-{seq}`) |
| | Multi-currency | ⬜ | DEV-117 |
| | Tax (VAT/GST/sales) | ⬜ | DEV-116 |
| | Discounts & partial billing | ⬜ | DEV-118 |
| **Payments** | Provider (Stripe/PayPal), methods | ⬜ | DEV-77, DEV-125 |
| | Online payment links | ⬜ | DEV-126 |
| | Terms (Net 15/30) | ⬜ | DEV-111 |
| | Partial payments & deposits | ⬜ | DEV-127 |
| | Auto reconciliation | ⬜ | DEV-128 |
| **Automation** | Recurring invoices (retainers) | ⬜ | DEV-129 (Neon pg_cron) |
| | Automated overdue reminders | ⬜ | DEV-130 |
| | Late fees | ⬜ | DEV-131 |
| | Email delivery + read receipts | ⬜ | DEV-76 + DEV-122 |
| **Reporting** | Outstanding/overdue + aging (30/60/90) | ⬜ | DEV-132 |
| | Revenue by client/project/period | ⬜ | DEV-133 |
| | Profit & utilization | ⬜ | DEV-134 |
| | Tax summary | ⬜ | DEV-135 |
| **Document & Status** | Statuses (draft/sent/viewed/paid/overdue) | 🟡 | draft/sent/paid/overdue done; viewed→DEV-122 |
| | Quotes/estimates → invoice | ⬜ | DEV-120 |
| | Credit notes & refunds | ⬜ | DEV-121 |
| | PDF export/download | ⬜ | DEV-76 / DEV-105 |
| **Admin & Compliance** | Audit trail | ⬜ | DEV-136 |
| | Backup & export (CSV) | ⬜ | DEV-137 |
| | User roles/permissions | ⬜ | DEV-69 (M4) |
| | Accounting integration (QuickBooks/Xero) | ⬜ | DEV-138 |

---

## Milestones (post-launch)

| Milestone | Target | Tickets |
|---|---|---|
| **M7 · Client & Project Depth** | 2026-09-04 | DEV-109 projects · 110 contacts · 111 payment terms · 112 billable flag · 113 rate resolution · 114 time by project/task |
| **M8 · Invoice Engine v2** (keystone) | 2026-09-25 | **DEV-115 line items** · 116 tax · 117 multi-currency · 118 discounts/partial · 119 fixed-fee/milestone |
| **M9 · Quotes, Documents & Delivery** | 2026-10-09 | DEV-120 quotes→invoice · 121 credit notes/refunds · 122 viewed/read-receipts · 123 expenses+receipts · 124 mileage · DEV-76 PDF/email · DEV-104 docs · DEV-105 Drive |
| **M10 · Payments & Reconciliation** | 2026-10-30 | DEV-125 payments ledger · 126 pay links · 127 partial/deposits · 128 reconciliation · DEV-77 Stripe |
| **M11 · Billing Automation** | 2026-11-13 | DEV-129 recurring (pg_cron) · 130 reminders · 131 late fees |
| **M12 · Financial Reporting** | 2026-11-27 | DEV-132 balances/aging · 133 revenue · 134 utilization/profit · 135 tax summary · DEV-74 timesheet reporting |
| **M13 · Admin, Compliance & Integrations** | 2026-12-11 | DEV-136 audit trail · 137 backup/export · 138 QuickBooks/Xero (RBAC = DEV-69 in M4) |

## Critical path & sequencing notes

- **M8 / DEV-115 (invoice line-items) is the keystone.** Today an invoice is a single `amount`; line items unblock tax, discounts, multi-currency, PDF, payments, and accurate reporting. Do M7 first (projects + billable flag feed everything), then M8.
- **`src/lib/invoicing.ts` `buildInvoiceDraft`** is the single source of truth for invoice generation (Generate button, form prefill, create) — extend it for billable-only hours (DEV-112), line items (DEV-115), expenses (DEV-123), and fixed-fee/milestone (DEV-119) rather than forking logic.
- **Recurring/automation (M11)** uses **Neon `pg_cron`** calling the same generator — not Vercel Cron (schedule lives with the data; no extra protected endpoint).
- **Migrations** are additive Drizzle migrations (`db:generate` → review → `db:migrate`); apply to dev → staging → prod (production Neon project `EndLessWorlds.Marketing`) ahead of each deploy. RLS + soft-delete on every new table.
- **Audit trail (DEV-136)** is cross-cutting and already mandated by `CLAUDE.md` — wire it as the payments/credit-note/invoice mutations land.
