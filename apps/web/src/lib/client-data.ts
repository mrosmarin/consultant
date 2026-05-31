import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, payments, projects } from "@/db/schema";
import { getAccess, type Access } from "@/lib/auth/rbac";

// Read-only data access for the client portal (DEV-140). Everything is scoped to
// the client's company_id; the owning consultant is whoever owns that company
// (companies.user_id). Clients only ever see ISSUED invoices (never drafts).

export type ClientCompany = {
  id: string;
  name: string;
  currency: string;
  paymentTermsDays: number;
};

// Resolve the signed-in client + their company in one call. Returns null when the
// caller isn't a client (the layout/guard handles redirecting); `company` is null
// when the client has no company assigned (defensive — the invite form requires one).
export async function getClientContext(): Promise<
  { access: Access; company: ClientCompany | null } | null
> {
  const access = await getAccess();
  if (!access || access.role !== "client") return null;
  const company = access.companyId ? await getClientCompany(access.companyId) : null;
  return { access, company };
}

export async function getClientCompany(companyId: string): Promise<ClientCompany | null> {
  const [c] = await db
    .select({
      id: companies.id,
      name: companies.name,
      currency: companies.currency,
      paymentTermsDays: companies.paymentTermsDays,
    })
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);
  return c ?? null;
}

export type ClientInvoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  amount: string;
  status: string;
  publicToken: string | null;
  outstanding: number;
};

export async function getClientInvoices(companyId: string): Promise<ClientInvoice[]> {
  // Issued invoices only — drafts are the consultant's WIP and stay hidden.
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      amount: invoices.amount,
      status: invoices.status,
      publicToken: invoices.publicToken,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, companyId),
        eq(invoices.type, "invoice"),
        ne(invoices.status, "draft"),
        isNull(invoices.deletedAt),
      ),
    )
    .orderBy(desc(invoices.issueDate), desc(invoices.createdAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  // Payments + issued credit notes reduce the outstanding balance.
  const payAgg = await db
    .select({ invoiceId: payments.invoiceId, paid: sql<string>`sum(${payments.amount})` })
    .from(payments)
    .where(and(inArray(payments.invoiceId, ids), isNull(payments.deletedAt)))
    .groupBy(payments.invoiceId);
  const paidBy = new Map(payAgg.map((r) => [r.invoiceId, Number(r.paid)]));

  const creditAgg = await db
    .select({ creditedInvoiceId: invoices.creditedInvoiceId, credited: sql<string>`sum(${invoices.amount})` })
    .from(invoices)
    .where(
      and(
        inArray(invoices.creditedInvoiceId, ids),
        eq(invoices.type, "credit_note"),
        eq(invoices.status, "issued"),
        isNull(invoices.deletedAt),
      ),
    )
    .groupBy(invoices.creditedInvoiceId);
  const creditBy = new Map(creditAgg.map((r) => [r.creditedInvoiceId, Number(r.credited)]));

  return rows.map((r) => {
    const outstanding = Number(r.amount) - (paidBy.get(r.id) ?? 0) - (creditBy.get(r.id) ?? 0);
    return { ...r, outstanding: Math.max(0, Math.round(outstanding * 100) / 100) };
  });
}

export async function getClientProjects(companyId: string) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
    })
    .from(projects)
    .where(and(eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .orderBy(asc(projects.name));
}
