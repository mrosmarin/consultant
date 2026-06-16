import { pgTable, uuid, text, timestamp, date, time, numeric, integer, boolean } from "drizzle-orm/pg-core";

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

// Portal roles (DEV-69). The allowlist row carries the role, so an invite IS the
// role assignment; role resolves from the signed-in user's email at session time.
//   - admin:       full access to the /account portal + all data + access mgmt
//   - team_member: /account but timesheet-only (section gating — DEV-141)
//   - client:      read-only /client portal scoped to their company (DEV-140)
export const ROLES = ["admin", "team_member", "client"] as const;
export type Role = (typeof ROLES)[number];

// Portal access allowlist. Only emails present here (and not soft-deleted) may
// sign up / sign in — enforced app-side in the auth server actions. Emails are
// stored lowercase. RLS enabled as a backstop.
export const allowedEmails = pgTable("allowed_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  // Portal role for this email (DEV-69). Defaults to admin so every pre-RBAC
  // row stays fully privileged after the migration.
  role: text("role").notNull().default("admin"),
  // For role = client: the company whose data this user may view (DEV-140).
  // Null for admin / team_member. The owning consultant is derived from
  // companies.user_id, so no separate owner column is needed.
  companyId: uuid("company_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const BILLING_TYPES = ["hourly", "retainer", "fixed", "milestone"] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

export const MILESTONE_STATUSES = ["pending", "invoiced"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

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
  // Flat project fee for billing_type = "fixed" (DEV-119).
  fixedAmount: numeric("fixed_amount", { precision: 12, scale: 2 }),
  billingFrequency: text("billing_frequency").notNull().default("monthly"),
  billingAnchorDay: integer("billing_anchor_day"),
  // Net payment terms in days (0 = due on receipt). Drives the invoice due-date
  // default. Defaults to 30 (NET_TERMS_DAYS).
  paymentTermsDays: integer("payment_terms_days").notNull().default(30),
  // Prefix for generated invoice numbers (e.g. "ACME" → ACME-0001). Suggested
  // from the name at onboarding; editable.
  invoicePrefix: text("invoice_prefix"),
  // ISO 4217 currency this client is invoiced in (DEV-117); snapshotted onto
  // each invoice at create. Default USD. No FX conversion — amounts stay in
  // their own currency.
  currency: text("currency").notNull().default("USD"),
  // Default tax for this client's invoices (DEV-116). Rate is a percent
  // (e.g. 8.875 = 8.875%); label is shown on the invoice (e.g. "NY Sales Tax").
  // taxExempt overrides the rate — no tax is applied regardless of rate.
  taxRate: numeric("tax_rate", { precision: 6, scale: 3 }),
  taxLabel: text("tax_label"),
  taxExempt: boolean("tax_exempt").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Contacts at a client company (DEV-110). The legacy single contact on
// `companies` is backfilled here as primary by migration 0012. Plain uuid
// company_id (no hard FK — established pattern); owner-scoped + RLS + soft-delete.
export const companyContacts = pgTable("company_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const PROJECT_STATUSES = ["active", "closed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// Projects / engagements under a client company (DEV-109). Time is logged
// against a project (optional), and a project can carry an hourly-rate override
// that takes precedence over the company rate (rate resolution — DEV-113).
// Owner-scoped, RLS backstop, soft-delete — same model as companies.
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
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
  // Optional project under the company. Plain uuid (no hard FK) — same pattern
  // as billed_invoice_id; ownership/company-match enforced app-side.
  projectId: uuid("project_id"),
  // Free-text task / activity within the project/company (e.g. "Discovery call").
  task: text("task"),
  workDate: date("work_date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  client: text("client"),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  // Effective hourly rate snapshotted at log time: entry override → project
  // rate → company rate (null for retainer or rateless companies). Keeps
  // historical invoices stable if a company/project rate later changes.
  rate: numeric("rate", { precision: 12, scale: 2 }),
  // Non-billable time is tracked but excluded from invoice generation; feeds
  // utilization reporting (DEV-134).
  billable: boolean("billable").notNull().default(true),
  notes: text("notes"),
  // Who physically logged this entry (DEV-141). For the consultant's own time
  // this equals user_id; for a team member it's the team member's id while
  // user_id stays the tenant (consultant) so the time rolls into the tenant's
  // timesheet + invoicing with no change to those owner-scoped queries.
  // Nullable; null means "logged by the owner".
  loggedBy: text("logged_by"),
  // Set when an entry is rolled into a generated invoice, so it isn't billed
  // twice. billed_invoice_id points at that invoice (no hard FK ordering needs).
  billedAt: timestamp("billed_at", { withTimezone: true }),
  billedInvoiceId: uuid("billed_invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const INVOICE_STATUSES = ["draft", "sent", "viewed", "partial", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// How a payment was received (DEV-125). Manual methods + provider placeholders.
export const PAYMENT_METHODS = ["check", "bank_transfer", "cash", "card", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// The invoices table is a shared document model (DEV-120): a row is an invoice
// or a quote/estimate, distinguished by `type`. Quotes reuse the entire money +
// line-item machinery and carry their own status lifecycle.
export const DOCUMENT_TYPES = ["invoice", "quote", "credit_note"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined", "expired"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// Credit notes (DEV-121) are documents (type = "credit_note") linked to the
// invoice they credit via `credited_invoice_id`. Their `amount` reduces that
// invoice's effective outstanding balance.
export const CREDIT_NOTE_STATUSES = ["issued", "void"] as const;
export type CreditNoteStatus = (typeof CREDIT_NOTE_STATUSES)[number];

// Portal invoicing. Same ownership model as time_entries (app-side scoping +
// RLS backstop). company_id references companies.id (nullable for legacy rows);
// the legacy free-text `client` is retained as a display fallback. status is a
// free-text column constrained to INVOICE_STATUSES app-side. PDF/email (DEV-76)
// and Stripe payments (DEV-77) are out of scope.
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  // "invoice" | "quote" (DEV-120). Quotes share this table + line items; their
  // status uses QUOTE_STATUSES and they number with a separate "-Q-" sequence.
  type: text("type").notNull().default("invoice"),
  // For a quote: optional expiry date. For an invoice created by converting a
  // quote: the quote it came from. Both null otherwise.
  validUntil: date("valid_until"),
  sourceQuoteId: uuid("source_quote_id"),
  // For a credit_note (DEV-121): the invoice it credits. Its amount reduces that
  // invoice's effective outstanding balance.
  creditedInvoiceId: uuid("credited_invoice_id"),
  invoiceNumber: text("invoice_number").notNull(),
  client: text("client"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  // ISO 4217 currency captured from the company at create (DEV-117). Default USD.
  currency: text("currency").notNull().default("USD"),
  // Money breakdown (DEV-116): subtotal = Σ(line_total); tax snapshotted from the
  // company at create time (rate is a percent, label shown on the invoice);
  // amount = subtotal + tax_amount (the grand total — kept authoritative for
  // back-compat). Pre-tax invoices have subtotal = amount and tax_amount = 0.
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  // Invoice-level discount (DEV-118). discount_type is "percent" | "fixed" | null;
  // discount_value is the entered percent or fixed amount; discount_amount is the
  // computed dollar discount. Applied to the subtotal BEFORE tax, so:
  // amount = (subtotal − discount_amount) + tax_amount.
  discountType: text("discount_type"),
  discountValue: numeric("discount_value", { precision: 12, scale: 3 }),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }),
  taxRate: numeric("tax_rate", { precision: 6, scale: 3 }),
  taxLabel: text("tax_label"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  // Read receipts (DEV-122): a per-document random token powers a no-login public
  // view at /invoice/<token>; viewed_at stamps the first open (and promotes a
  // "sent" invoice to "viewed").
  publicToken: uuid("public_token").notNull().defaultRandom().unique(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  // Email delivery (DEV-76): when the invoice was last emailed + to whom.
  sentAt: timestamp("sent_at", { withTimezone: true }),
  sentTo: text("sent_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Line items for an invoice (DEV-115). The invoice's `amount` is the total =
// sum(line_total). Plain uuid invoice_id (no hard FK — established pattern);
// owner-scoped + RLS + soft-delete. source_type/source_id optionally link a line
// back to its origin (a time entry, later an expense).
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  invoiceId: uuid("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitAmount: numeric("unit_amount", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  sourceType: text("source_type"),
  sourceId: uuid("source_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Billing milestones for a company on billing_type = "milestone" (DEV-119):
// a schedule of named, fixed-amount chunks. Generating an invoice bills the
// PENDING milestones (each becomes a line item) and stamps them "invoiced" with
// the invoice id — mirrors how time entries are stamped billed. Company-level
// (the billing model + Generate flow are company-centric); plain uuid company_id,
// owner-scoped + RLS + soft-delete.
export const companyMilestones = pgTable("company_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  invoicedInvoiceId: uuid("invoiced_invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const EXPENSE_CATEGORIES = [
  "Travel",
  "Meals",
  "Lodging",
  "Software",
  "Hardware",
  "Subcontractor",
  "Mileage",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Default per-mile reimbursement rate (US IRS standard, 2026), used as the form
// default; the per-entry rate is editable (DEV-124).
export const DEFAULT_MILEAGE_RATE = 0.7;

// Reimbursable/non-reimbursable expenses logged against a client (and optional
// project) — DEV-123. Billable unbilled expenses are pulled into an invoice as
// line items and stamped billed (billed_at + billed_invoice_id), mirroring time
// entries. receipt_key points at a stored receipt file (DEV-104 storage; the
// upload UI lands with that ticket). Owner-scoped + RLS + soft-delete.
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id").notNull(),
  projectId: uuid("project_id"),
  expenseDate: date("expense_date").notNull(),
  category: text("category").notNull().default("Other"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  // Mileage (DEV-124): for category "Mileage", amount = distance × unit_rate.
  // Null for ordinary expenses.
  distance: numeric("distance", { precision: 10, scale: 2 }),
  unitRate: numeric("unit_rate", { precision: 8, scale: 3 }),
  billable: boolean("billable").notNull().default(true),
  notes: text("notes"),
  receiptKey: text("receipt_key"),
  billedAt: timestamp("billed_at", { withTimezone: true }),
  billedInvoiceId: uuid("billed_invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Files attached to a company (DEV-104). Bytes live in object storage (Vercel
// Blob in prod) keyed by storage_key; this row holds metadata. Owner-scoped +
// RLS + soft-delete.
export const companyDocuments = pgTable("company_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  companyId: uuid("company_id").notNull(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  storageKey: text("storage_key").notNull(),
  // Set when stored in Vercel Blob (its public URL); null for the DB fallback.
  storageUrl: text("storage_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Dev/test fallback object store used when BLOB_READ_WRITE_TOKEN is unset (the
// sandbox can't reach Vercel Blob). Bytes are held base64 in `data`, keyed by
// the same storage_key. In prod (token set) this table is unused.
export const documentBlobs = pgTable("document_blobs", {
  storageKey: text("storage_key").primaryKey(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Payments recorded against an invoice (DEV-125/127). Manual ledger — checks,
// bank transfers, cash, etc. An invoice's outstanding = amount − Σ(credit notes)
// − Σ(payments); status flips to "partial" / "paid" as payments land. Owner-
// scoped + RLS + soft-delete.
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  invoiceId: uuid("invoice_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull().default("check"),
  reference: text("reference"),
  receivedDate: date("received_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// The owner's business / invoice-issuer profile (DEV-148). Singleton per owner
// (one active row, upserted from /account/settings). Read live by the invoice
// PDF + public web view to render the "from" / remit-to block + payment
// instructions, so clients know who and how to pay. Every payment field is
// optional and only shown on the invoice when set. Owner-scoped + RLS +
// soft-delete (app-side scoping by user_id).
export const businessSettings = pgTable("business_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  // Issuer identity + address.
  legalName: text("legal_name"),
  // A person/contact name shown on the invoice alongside the legal name.
  contactName: text("contact_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  email: text("email"),
  phone: text("phone"),
  taxId: text("tax_id"),
  // Bank / ACH / wire.
  bankName: text("bank_name"),
  bankRouting: text("bank_routing"),
  bankAccount: text("bank_account"),
  bankAccountName: text("bank_account_name"),
  // Check by mail.
  checkPayableTo: text("check_payable_to"),
  checkMailingAddress: text("check_mailing_address"),
  // Online.
  zelle: text("zelle"),
  venmo: text("venmo"),
  paypal: text("paypal"),
  payLinkUrl: text("pay_link_url"),
  // Free-text catch-all shown under Payment.
  remitNote: text("remit_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
