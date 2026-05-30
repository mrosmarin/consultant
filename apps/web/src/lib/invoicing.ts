import "server-only";
import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, timeEntries } from "@/db/schema";
import { latestCompletedPeriod, suggestInvoicePrefix, addDaysISO, NET_TERMS_DAYS } from "./billing";

type Company = typeof companies.$inferSelect;

export type InvoiceDraft = {
  invoiceNumber: string;
  amount: string; // numeric string, e.g. "750.00"
  issueDate: string;
  dueDate: string;
  notes: string;
  periodStart: string;
  periodEnd: string;
  hours: number; // 0 for retainer
  billedEntryIds: string[]; // hourly entries this draft would mark billed
};

// Single source of truth for what an invoice for a company should look like
// right now. Used by the "Generate invoice" button, the invoice form's prefill,
// and the form's create action — so they can never drift. Pure read (no writes).
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
      .select({ id: timeEntries.id, hours: timeEntries.hours, rate: timeEntries.rate })
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
    // Amount = Σ(hours × effective rate). Each entry carries its own rate
    // (entry override → project → company, snapshotted at log time); fall back
    // to the company rate for legacy entries logged before rate-tracking.
    const fallback = Number(company.hourlyRate ?? 0);
    let hours = 0;
    let amount = 0;
    const rates = new Set<number>();
    for (const e of entries) {
      const h = Number(e.hours);
      const r = e.rate != null ? Number(e.rate) : fallback;
      hours += h;
      amount += h * r;
      rates.add(r);
    }
    const rateLabel =
      rates.size === 1 ? `@ $${[...rates][0].toFixed(2)}/hr` : "(mixed rates)";
    return {
      invoiceNumber,
      amount: amount.toFixed(2),
      issueDate,
      dueDate,
      notes: `Auto-generated • ${period.start} – ${period.end} • ${hours} hrs ${rateLabel}`,
      periodStart: period.start,
      periodEnd: period.end,
      hours,
      billedEntryIds: entries.map((e) => e.id),
    };
  }

  // retainer
  return {
    invoiceNumber,
    amount: Number(company.retainerAmount ?? 0).toFixed(2),
    issueDate,
    dueDate,
    notes: `Auto-generated retainer • ${period.start} – ${period.end}`,
    periodStart: period.start,
    periodEnd: period.end,
    hours: 0,
    billedEntryIds: [],
  };
}
