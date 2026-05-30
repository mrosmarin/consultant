import "server-only";
import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, invoiceLineItems, timeEntries } from "@/db/schema";
import { latestCompletedPeriod, suggestInvoicePrefix, addDaysISO, NET_TERMS_DAYS } from "./billing";

type Company = typeof companies.$inferSelect;

export type DraftLineItem = {
  description: string;
  quantity: string; // numeric strings
  unitAmount: string;
  lineTotal: string;
  sourceType: string | null;
  sourceId: string | null;
};

export type InvoiceDraft = {
  invoiceNumber: string;
  amount: string; // total = Σ(lineTotal)
  issueDate: string;
  dueDate: string;
  notes: string;
  periodStart: string;
  periodEnd: string;
  hours: number; // 0 for retainer
  lineItems: DraftLineItem[];
  billedEntryIds: string[]; // hourly entries this draft would mark billed
};

// Persist line items for a freshly-created invoice (sortOrder follows array
// order). Used by both the Generate action and the manual create action.
export async function insertInvoiceLineItems(
  userId: string,
  invoiceId: string,
  lines: DraftLineItem[],
): Promise<void> {
  if (lines.length === 0) return;
  await db.insert(invoiceLineItems).values(
    lines.map((l, i) => ({
      userId,
      invoiceId,
      description: l.description,
      quantity: l.quantity,
      unitAmount: l.unitAmount,
      lineTotal: l.lineTotal,
      sortOrder: i,
      sourceType: l.sourceType,
      sourceId: l.sourceId,
    })),
  );
}

// Single source of truth for what an invoice for a company should look like
// right now (header + line items). Used by the "Generate invoice" button, the
// invoice form's prefill, and the form's create action — so they can never
// drift. Pure read (no writes).
export async function buildInvoiceDraft(company: Company, userId: string): Promise<InvoiceDraft> {
  const today = new Date().toISOString().slice(0, 10);
  const period = latestCompletedPeriod(company.billingFrequency, company.billingAnchorDay, today);
  const prefix = company.invoicePrefix || suggestInvoicePrefix(company.name);

  // Per-company number; count includes soft-deleted so numbers are never reused.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.companyId, company.id));
  const invoiceNumber = `${prefix}-${String((n ?? 0) + 1).padStart(4, "0")}`;

  const issueDate = today;
  const dueDate = addDaysISO(issueDate, company.paymentTermsDays ?? NET_TERMS_DAYS);

  if (company.billingType === "hourly") {
    const entries = await db
      .select({
        id: timeEntries.id,
        hours: timeEntries.hours,
        rate: timeEntries.rate,
        workDate: timeEntries.workDate,
        task: timeEntries.task,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, company.id),
          eq(timeEntries.userId, userId),
          eq(timeEntries.billable, true),
          isNull(timeEntries.deletedAt),
          isNull(timeEntries.billedAt),
          lte(timeEntries.workDate, period.end),
        ),
      );
    // One line item per billable unbilled time entry, at its own snapshotted
    // rate (entry override → project → company; fall back to the company rate
    // for legacy entries). Total = Σ(lineTotal).
    const fallback = Number(company.hourlyRate ?? 0);
    let hours = 0;
    let amount = 0;
    const lineItems: DraftLineItem[] = entries.map((e) => {
      const h = Number(e.hours);
      const r = e.rate != null ? Number(e.rate) : fallback;
      const total = h * r;
      hours += h;
      amount += total;
      return {
        description: `${e.workDate}${e.task ? ` — ${e.task}` : ""} (${h} hrs @ $${r.toFixed(2)}/hr)`,
        quantity: h.toFixed(2),
        unitAmount: r.toFixed(2),
        lineTotal: total.toFixed(2),
        sourceType: "time",
        sourceId: e.id,
      };
    });
    return {
      invoiceNumber,
      amount: amount.toFixed(2),
      issueDate,
      dueDate,
      notes: `Auto-generated • ${period.start} – ${period.end} • ${hours} hrs`,
      periodStart: period.start,
      periodEnd: period.end,
      hours,
      lineItems,
      billedEntryIds: entries.map((e) => e.id),
    };
  }

  // retainer — a single flat line for the period
  const retainer = Number(company.retainerAmount ?? 0);
  return {
    invoiceNumber,
    amount: retainer.toFixed(2),
    issueDate,
    dueDate,
    notes: `Auto-generated retainer • ${period.start} – ${period.end}`,
    periodStart: period.start,
    periodEnd: period.end,
    hours: 0,
    lineItems: [
      {
        description: `Retainer — ${period.start} to ${period.end}`,
        quantity: "1.00",
        unitAmount: retainer.toFixed(2),
        lineTotal: retainer.toFixed(2),
        sourceType: "retainer",
        sourceId: null,
      },
    ],
    billedEntryIds: [],
  };
}
