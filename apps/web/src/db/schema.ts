import { pgTable, uuid, text, timestamp, date, time, numeric, integer } from "drizzle-orm/pg-core";

// Contact / lead-capture submissions from the public site.
// RLS enabled with a public-insert policy in the migration.
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Portal access allowlist. Only emails present here (and not soft-deleted) may
// sign up / sign in — enforced app-side in the auth server actions. Emails are
// stored lowercase. RLS enabled as a backstop.
export const allowedEmails = pgTable("allowed_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const BILLING_TYPES = ["hourly", "retainer"] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

export const BILLING_FREQUENCIES = ["weekly", "biweekly", "semimonthly", "monthly"] as const;
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

// Onboarded client companies. Timesheets and invoices reference a company so
// they can be accrued against its billing terms (DEV-103). Owned by the
// consultant (user_id = session user id), same scoping model as the other
// portal tables. RLS enabled as a backstop; soft-delete via deleted_at.
//
// Billing config supports two models (billing_type):
//   - "hourly":   invoice = sum(hours in period) * hourly_rate
//   - "retainer": invoice = retainer_amount per period (flat)
// billing_anchor_day seeds the period boundary for accrual (day-of-month for
// monthly/semimonthly, day-of-week 0–6 for weekly/biweekly); nullable.
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  address: text("address"),
  notes: text("notes"),
  billingType: text("billing_type").notNull().default("hourly"),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  retainerAmount: numeric("retainer_amount", { precision: 12, scale: 2 }),
  billingFrequency: text("billing_frequency").notNull().default("monthly"),
  billingAnchorDay: integer("billing_anchor_day"),
  // Prefix for generated invoice numbers (e.g. "ACME" → ACME-0001). Suggested
  // from the name at onboarding; editable.
  invoicePrefix: text("invoice_prefix"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Portal time tracking. Ownership is enforced app-side (where user_id =
// session.user.id); RLS is enabled as a backstop. user_id holds the Neon
// Auth user id (no hard FK into the neon_auth schema). company_id references
// companies.id (nullable for legacy rows); the legacy free-text `client` is
// retained for those rows and as a display fallback. start_time/end_time are
// optional clock times that can derive `hours`; `hours` stays authoritative.
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  workDate: date("work_date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  client: text("client"),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  notes: text("notes"),
  // Set when an entry is rolled into a generated invoice, so it isn't billed
  // twice. billed_invoice_id points at that invoice (no hard FK ordering needs).
  billedAt: timestamp("billed_at", { withTimezone: true }),
  billedInvoiceId: uuid("billed_invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// Portal invoicing. Same ownership model as time_entries (app-side scoping +
// RLS backstop). company_id references companies.id (nullable for legacy rows);
// the legacy free-text `client` is retained as a display fallback. status is a
// free-text column constrained to INVOICE_STATUSES app-side. PDF/email (DEV-76)
// and Stripe payments (DEV-77) are out of scope.
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  invoiceNumber: text("invoice_number").notNull(),
  client: text("client"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
