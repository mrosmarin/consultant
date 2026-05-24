# EndlessWorlds — Brand, IA & Page Content (DEV-89)

> Foundation for the M2 public-site build. Derived from the founder's résumé.
> Draft v1 — iterate freely.

## Positioning

**EndlessWorlds** — _Engineering leadership and AI-native architecture for teams that need to ship._

Sub-line: _30 years turning legacy constraints and AI ambition into production systems — as your fractional engineering leader or hands-on architect._

Proof points (reuse across pages): 30-year track record · MVPs delivered weeks ahead of schedule · 90% developer-productivity gains · zero-breach multi-tenant platforms · Finance / Media / Technology.

---

## Brand guidelines

Direction: **technical authority, not flashy** — a "deep systems" aesthetic. Confident navy, an electric-azure accent for the AI/cloud edge, generous whitespace, mono type for technical credibility. **Dark-mode is a first-class look.**

| Token | Value | Use |
|---|---|---|
| Primary — Deep Space Navy | `#1E3A5F` | brand, headings, primary buttons |
| Accent — Electric Azure | `#0EA5E9` | links, highlights, AI/cloud motifs |
| Neutrals — Slate | shadcn slate scale (wired in DEV-86) | text, surfaces, borders |
| Dark canvas | `#0B1220` / `#0F172A` | dark-mode background |

- **Type:** Geist Sans (UI/headings, tight tracking on display), Geist Mono (labels, metrics, code accents) — both already in the app. Mono on stat numbers reads "engineer."
- **Logo / name:** wordmark `EndlessWorlds` (one word, two capitals, medium weight, navy); optional mono `{ }` / orbit glyph. Footer legal name: _EndlessWorlds, LLC_.
- **Voice:** senior, precise, outcomes-first, plain-spoken. Lead with concrete results + metrics; short sentences; confident, not boastful; no buzzword salad.
- **Design tokens → DEV-86 refinement:** set theme `--primary` → navy, add an `--accent` → azure (keep slate neutrals).

---

## Information architecture

**Public** — nav: `Services · Work · About · Insights · Contact` · logo left · theme toggle + **"Get in touch"** CTA right.

| Route | Page |
|---|---|
| `/` | Home |
| `/services` | Services (overview + 3 sections) |
| `/work` → `/work/[slug]` | Case studies |
| `/about` | About / bio |
| `/insights` → `/insights/[slug]` | Insights / blog (shell first) |
| `/contact` | Contact + lead form |

**Portal** (auth-gated; payments deferred, project-showcase dropped from MVP):

| Route | Page |
|---|---|
| `/account` | Dashboard (overview) |
| `/account/timesheets` | Time tracking by client/project |
| `/account/invoices` | Invoice records (create/track; pay-online later) |

---

## Page content (draft)

### Home
- **Hero:** "Engineering leadership and AI-native architecture for teams that need to ship." + sub-line. CTAs: **[Work with me]** **[See the work]**.
- **Stat band (mono):** `30 yrs` leading engineering · `90%` dev-productivity gains · `AWS · GCP · Azure` · MVPs shipped early.
- **Services teaser:** 3 cards (below) → **Selected work** strip → short bio → closing CTA.

### Services (3 core)
1. **Fractional Engineering Leadership** — a Director/VP of Engineering on demand: technical strategy, roadmaps, org design, hiring & mentoring, delivery. _Led distributed teams 15+ yrs; MVPs delivered ahead of schedule._
2. **AI-Native & Cloud Architecture** — GenAI orchestration (LLM agents with skills, memory, tools), Kubernetes multi-tenant platforms, microservices (NATS.io), secure multi-cloud. _Built OpenClaw; drove AI dev workflows to 90% productivity gains._
3. **Legacy Modernization & Cloud Migration** — de-risk moving off OS/400, PICK, and VMs onto Kubernetes; CI/CD modernization — preserving business logic with zero downtime. _PCF → OpenShift; Jenkins → Bitbucket/Helm/Artifactory._

### Work / Case studies
- **OpenClaw @ Codiac** — secure GenAI orchestration on customer-owned Kubernetes; MVP 4 weeks early; zero-breach multi-tenant security.
- **Enterprise AI Chatbot @ Invesco** — re-architected Dialogflow → OpenAI on Azure; CI/CD modernization; EKS.
- **Product Data Access Portal @ Oppenheimer** — secure self-service product-data platform; cloud migration (PCF → OpenShift); OIDC.
- **Objective Health @ McKinsey** — hospital analytics rendering 50M-row datasets for executive decisions.
- **CleverCAD @ Clever Devices** — mission-critical transit voice comms + monitoring.

> Iterate: confirm how much client-naming is OK (some may prefer anonymized: "a global asset manager," "a top-tier consultancy").

### About
30-year software leader and hands-on architect across Finance, Media, and Technology. Director-level engineering leadership with a builder's bias — ships code and teams alike. Co-founder background; BS Computer Science, SUNY Plattsburgh.

### Insights
Launch topics (page shell now, articles later): AI orchestration in production · cloud-native architecture · legacy modernization without the rewrite · engineering leadership · AI-assisted developer productivity.

### Contact
Lead form → Neon: **name, email, company, message**. Direct contact: **email only**, branded **`hello@endlessworlds.xyz`** _(placeholder — real branded address TBD)_.

> **Privacy (firm):** no home address, no phone number on the site. No personal Gmail — branded address only.

---

## Low-fi wireframes

**Home**
```
┌──────────────────────────────────────────────────────┐
│ EndlessWorlds     Services Work About Insights ◐ [Get in touch]│
├──────────────────────────────────────────────────────┤
│  Engineering leadership and AI-native                  │
│  architecture for teams that need to ship.             │
│  30 yrs turning legacy + AI into production.            │
│  [ Work with me ]   [ See the work ]                    │
├──────────────────────────────────────────────────────┤
│  30 yrs   |   90% dev gains   |   AWS · GCP · Azure      │  ← mono stats
├──────────────────────────────────────────────────────┤
│ [Fractional Lead] [AI & Cloud Arch] [Modernization]    │  ← 3 cards
├──────────────────────────────────────────────────────┤
│ Selected work:  OpenClaw · Invesco · McKinsey · …       │
├──────────────────────────────────────────────────────┤
│ Short bio                              [ Get in touch ] │
└──────────────────────────────────────────────────────┘
```

**Service page** — `[hero statement] → [what you get bullets] → [proof / metric] → [related work] → CTA`

**Contact** — two columns: `form (name / email / company / message)` | `branded email + "responds within 1 business day"`

**Portal dashboard**
```
┌ EndlessWorlds · Portal ───────────────── user ▾  ◐ ┐
│ Dashboard | Timesheets | Invoices                    │
├──────────────────────────────────────────────────────┤
│  Hours this week: 0      Open invoices: 0             │
│  [ Log time ]   [ New invoice ]                       │
│  Recent activity …                                    │
└──────────────────────────────────────────────────────┘
```

---

## Open to iterate
- Brand palette (navy/azure) vs. an alternative (e.g., graphite/amber).
- Client-naming in case studies (named vs. anonymized).
- Final branded email address.
- Services framing / order.
