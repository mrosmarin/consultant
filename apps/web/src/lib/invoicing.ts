import "server-only";
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  companies,
  companyMilestones,
  expenses,
  invoices,
  invoiceLineItems,
  timeEntries,
} from "@/db/schema";
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
  hours: number; // 0 for non-hourly
  lineItems: DraftLineItem[];
  billedEntryIds: string[]; // hourly entries this draft would mark billed
  billedMilestoneIds: string[]; // milestones this draft would mark invoiced (DEV-119)
  billedExpenseIds: string[]; // billable expenses this draft would mark billed (DEV-123)
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

  // Per-company invoice number; count includes soft-deleted so numbers are never
  // reused. Excludes quotes (they number on their own "-Q-" sequence, DEV-120).
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.companyId, company.id), eq(invoices.type, "invoice")));
  const invoiceNumber = `${prefix}-${String((n ?? 0) + 1).padStart(4, "0")}`;

  const issueDate = today;
  const dueDate = addDaysISO(issueDate, company.paymentTermsDays ?? NET_TERMS_DAYS);

  // Billable, unbilled expenses for this company become line items on the
  // invoice regardless of billing type (DEV-123), and get stamped billed.
  const expenseRows = await db
    .select({
      id: expenses.id,
      expenseDate: expenses.expenseDate,
      category: expenses.category,
      amount: expenses.amount,
      notes: expenses.notes,
      distance: expenses.distance,
      unitRate: expenses.unitRate,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, company.id),
        eq(expenses.userId, userId),
        eq(expenses.billable, true),
        isNull(expenses.deletedAt),
        isNull(expenses.billedAt),
        lte(expenses.expenseDate, today),
      ),
    )
    .orderBy(asc(expenses.expenseDate));
  let expenseSubtotal = 0;
  const expenseLines: DraftLineItem[] = expenseRows.map((e) => {
    const amt = Number(e.amount);
    expenseSubtotal += amt;
    // Mileage lines spell out distance × rate (DEV-124); other expenses show
    // their category + note.
    const isMileage = e.category === "Mileage" && e.distance != null && e.unitRate != null;
    const description = isMileage
      ? `Mileage — ${Number(e.distance)} mi @ $${Number(e.unitRate)}/mi (${e.expenseDate})`
      : `Expense — ${e.category}${e.notes ? `: ${e.notes}` : ""} (${e.expenseDate})`;
    return {
      description,
      quantity: isMileage ? Number(e.distance).toFixed(2) : "1.00",
      unitAmount: isMileage ? Number(e.unitRate).toFixed(2) : amt.toFixed(2),
      lineTotal: amt.toFixed(2),
      sourceType: "expense",
      sourceId: e.id,
    };
  });
  const billedExpenseIds = expenseRows.map((e) => e.id);

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
      )
      .orderBy(asc(timeEntries.workDate));
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
    lineItems.push(...expenseLines);
    subtotal += expenseSubtotal;
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
      billedMilestoneIds: [],
      billedExpenseIds,
    };
  }

  if (company.billingType === "milestone") {
    // Bill the PENDING milestones — one line item each; generation stamps them
    // invoiced (reuses the partial-billing path via sourceType "milestone").
    const pending = await db
      .select({ id: companyMilestones.id, name: companyMilestones.name, amount: companyMilestones.amount })
      .from(companyMilestones)
      .where(
        and(
          eq(companyMilestones.companyId, company.id),
          eq(companyMilestones.userId, userId),
          eq(companyMilestones.status, "pending"),
          isNull(companyMilestones.deletedAt),
        ),
      )
      .orderBy(asc(companyMilestones.sortOrder), asc(companyMilestones.createdAt));
    let subtotal = 0;
    const lineItems: DraftLineItem[] = pending.map((m) => {
      const amt = Number(m.amount);
      subtotal += amt;
      return {
        description: `Milestone — ${m.name}`,
        quantity: "1.00",
        unitAmount: amt.toFixed(2),
        lineTotal: amt.toFixed(2),
        sourceType: "milestone",
        sourceId: m.id,
      };
    });
    lineItems.push(...expenseLines);
    subtotal += expenseSubtotal;
    const totals = computeInvoiceTotals(subtotal, company, null);
    return {
      invoiceNumber,
      currency: company.currency,
      ...totals,
      issueDate,
      dueDate,
      notes: `Milestones (${pending.length})`,
      periodStart: period.start,
      periodEnd: period.end,
      hours: 0,
      lineItems,
      billedEntryIds: [],
      billedMilestoneIds: pending.map((m) => m.id),
      billedExpenseIds,
    };
  }

  // fixed-fee — a single flat project fee; retainer — a single flat per-period line
  const isFixed = company.billingType === "fixed";
  const flat = Number((isFixed ? company.fixedAmount : company.retainerAmount) ?? 0);
  const totals = computeInvoiceTotals(flat + expenseSubtotal, company, null);
  return {
    invoiceNumber,
    currency: company.currency,
    ...totals,
    issueDate,
    dueDate,
    notes: isFixed
      ? "Fixed project fee"
      : `Auto-generated retainer • ${period.start} – ${period.end}`,
    periodStart: period.start,
    periodEnd: period.end,
    hours: 0,
    lineItems: [
      {
        description: isFixed ? "Fixed project fee" : `Retainer — ${period.start} to ${period.end}`,
        quantity: "1.00",
        unitAmount: flat.toFixed(2),
        lineTotal: flat.toFixed(2),
        sourceType: isFixed ? "fixed" : "retainer",
        sourceId: null,
      },
      ...expenseLines,
    ],
    billedEntryIds: [],
    billedMilestoneIds: [],
    billedExpenseIds,
  };
}
