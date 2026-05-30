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

export type TaxBreakdown = {
  subtotal: string; // Σ(lineTotal)
  taxRate: string | null; // percent, e.g. "8.875"; null when no tax applies
  taxLabel: string | null;
  taxAmount: string; // "0.00" when no tax
  total: string; // subtotal + taxAmount
};

export type DiscountInput = { type: "percent" | "fixed"; value: number } | null;

export type MoneyTotals = {
  subtotal: string;
  discountType: string | null; // "percent" | "fixed" | null
  discountValue: string | null; // entered percent or fixed amount
  discountAmount: string; // computed dollar discount; "0.00" when none
  taxRate: string | null;
  taxLabel: string | null;
  taxAmount: string;
  amount: string; // grand total = (subtotal − discountAmount) + taxAmount
};

export type InvoiceDraft = {
  invoiceNumber: string;
  currency: string;
  subtotal: string;
  discountType: string | null;
  discountValue: string | null;
  discountAmount: string;
  taxRate: string | null;
  taxLabel: string | null;
  taxAmount: string;
  amount: string; // grand total = (subtotal − discountAmount) + taxAmount
  issueDate: string;
  dueDate: string;
  notes: string;
  periodStart: string;
  periodEnd: string;
  hours: number; // 0 for retainer
  lineItems: DraftLineItem[];
  billedEntryIds: string[]; // hourly entries this draft would mark billed
};

// Compute the subtotal → tax → total breakdown for an invoice (DEV-116). Tax is
// a single percentage applied to the subtotal, snapshotted from the company.
// A tax-exempt client (or no/zero rate) yields zero tax and null rate/label.
export function computeTax(
  subtotal: number,
  company: Pick<Company, "taxRate" | "taxLabel" | "taxExempt">,
): TaxBreakdown {
  const rate = company.taxExempt ? 0 : Number(company.taxRate ?? 0);
  const applies = rate > 0;
  // tax = round(subtotal × rate/100) to cents → Math.round(subtotal × rate) / 100.
  const taxAmount = applies ? Math.round(subtotal * rate) / 100 : 0;
  return {
    subtotal: subtotal.toFixed(2),
    taxRate: applies ? String(rate) : null,
    taxLabel: applies ? (company.taxLabel?.trim() || "Tax") : null,
    taxAmount: taxAmount.toFixed(2),
    total: (subtotal + taxAmount).toFixed(2),
  };
}

// Dollar value of an invoice-level discount, rounded to cents, floored at 0 and
// capped at the subtotal (a discount can't exceed the line total). DEV-118.
export function computeDiscount(subtotal: number, discount: DiscountInput): number {
  if (!discount || !(discount.value > 0)) return 0;
  const raw = discount.type === "percent" ? (subtotal * discount.value) / 100 : discount.value;
  const amount = Math.round(raw * 100) / 100;
  return Math.min(Math.max(amount, 0), subtotal);
}

// Full money breakdown for an invoice: subtotal → discount → tax (on the
// discounted base) → grand total. Single source of truth shared by the draft,
// the Generate action, and the manual create action.
export function computeInvoiceTotals(
  subtotal: number,
  company: Pick<Company, "taxRate" | "taxLabel" | "taxExempt">,
  discount: DiscountInput,
): MoneyTotals {
  const discountAmount = computeDiscount(subtotal, discount);
  const discounted = subtotal - discountAmount;
  const tax = computeTax(discounted, company);
  const applies = discount != null && discount.value > 0 && discountAmount > 0;
  return {
    subtotal: subtotal.toFixed(2),
    discountType: applies ? discount!.type : null,
    discountValue: applies ? String(discount!.value) : null,
    discountAmount: discountAmount.toFixed(2),
    taxRate: tax.taxRate,
    taxLabel: tax.taxLabel,
    taxAmount: tax.taxAmount,
    amount: (discounted + Number(tax.taxAmount)).toFixed(2),
  };
}

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
// right now (header + line items + tax). Used by the "Generate invoice" button,
// the invoice form's prefill, and the form's create action — so they can never
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
    // for legacy entries). Subtotal = Σ(lineTotal).
    const fallback = Number(company.hourlyRate ?? 0);
    let hours = 0;
    let subtotal = 0;
    const lineItems: DraftLineItem[] = entries.map((e) => {
      const h = Number(e.hours);
      const r = e.rate != null ? Number(e.rate) : fallback;
      const total = h * r;
      hours += h;
      subtotal += total;
      return {
        description: `${e.workDate}${e.task ? ` — ${e.task}` : ""} (${h} hrs @ $${r.toFixed(2)}/hr)`,
        quantity: h.toFixed(2),
        unitAmount: r.toFixed(2),
        lineTotal: total.toFixed(2),
        sourceType: "time",
        sourceId: e.id,
      };
    });
    const totals = computeInvoiceTotals(subtotal, company, null);
    return {
      invoiceNumber,
      currency: company.currency,
      ...totals,
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
  const totals = computeInvoiceTotals(retainer, company, null);
  return {
    invoiceNumber,
    currency: company.currency,
    ...totals,
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
