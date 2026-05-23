# Product Context

## Why this exists

EndlessWorlds, LLC needs (1) a credible public web presence to win consulting clients and (2) a secure internal portal to run operations (time tracking, invoicing). Today neither exists. This project delivers both at `endlessworlds.xyz`.

## Problems it solves

**Public site**
- **Discoverability & credibility** — prospects can find and trust the consultancy.
- **Clear offer** — communicate services, thought leadership, and case studies.
- **Lead generation** — easy contact / lead-gen path.

**Secure portal**
- **Operations** — track time against projects, generate and manage invoices/billing.
- **Showcase** — present project work to authorized (internal/client) users.

## How it should work

- Visitors land on a clear, well-designed public site, explore services/insights, and convert via contact forms.
- Authenticated users sign in (OAuth/JWT) to a role-gated portal: dashboard → timesheets, invoicing, project showcase, all backed by the database.

## UX goals

- **Fast** — strong Core Web Vitals; Next.js + Vercel.
- **Accessible** — WCAG-minded; semantic HTML, keyboard nav, good contrast.
- **Trustworthy & distinctive** — professional design that avoids generic AI-template aesthetics.
- **Low-friction conversion** (public) and **efficient task flows** (portal).

## Security posture

- Portal is auth-gated with role-based access control (RBAC).
- RLS on every table; secrets server-only; audit trail on privileged actions (see [systemPatterns](systemPatterns.md)).
- Payment integration is a possibility for invoicing — treat any payment/PII data with extra care (Stripe best practices apply if added).

<!-- TODO: confirm exact public page list, brand direction, portal roles, and whether payments are in MVP scope -->
