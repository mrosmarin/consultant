import { pgTable, uuid, text, timestamp, date, numeric } from "drizzle-orm/pg-core";

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

// Portal time tracking. Ownership is enforced app-side (where user_id =
// session.user.id); RLS is enabled as a backstop. user_id holds the Neon
// Auth user id (no hard FK into the neon_auth schema).
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  workDate: date("work_date").notNull(),
  client: text("client").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// Portal invoicing. Same ownership model as time_entries (app-side scoping +
// RLS backstop). status is a free-text column constrained to INVOICE_STATUSES
// app-side. PDF/email (DEV-76) and Stripe payments (DEV-77) are out of scope.
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  client: text("client").notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
