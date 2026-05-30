"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  companies,
  companyMilestones,
  expenses,
  invoices,
  invoiceLineItems,
  timeEntries,
  INVOICE_STATUSES,
  type InvoiceStatus,
} from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { buildInvoiceDraft, computeInvoiceTotals, insertInvoiceLineItems, type DraftLineItem } from "@/lib/invoicing";
import { parseLineItems, parseDiscount } from "@/lib/invoice-input";

export type InvoiceState = { ok: boolean; error?: string } | null;

export async function createInvoice(
  _prev: InvoiceState,
  formData: FormData,
): Promise<InvoiceState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const invoiceNumber = (formData.get("invoiceNumber") as string)?.trim();
  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const issueDate = (formData.get("issueDate") as string)?.trim();
  const dueDate = (formData.get("dueDate") as string)?.trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const lineItemsRaw = (formData.get("lineItems") as string) ?? "";

  if (!invoiceNumber || !companyId || !issueDate || !dueDate) {
    return { ok: false, error: "Invoice #, company, and dates are required." };
  }
  if (dueDate < issueDate) {
    return { ok: false, error: "Due date can't be before the issue date." };
  }

  const parsed = parseLineItems(lineItemsRaw);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const discountParsed = parseDiscount(
    ((formData.get("discountType") as string) ?? "").trim(),
    ((formData.get("discountValue") as string) ?? "").trim(),
  );
  if ("error" in discountParsed) return { ok: false, error: discountParsed.error };

  // Line totals are derived server-side (never trust a client total). Each line
  // keeps its source (a time entry) so partial billing can stamp only those.
  const lines: DraftLineItem[] = parsed.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toFixed(2),
    unitAmount: l.unitAmount.toFixed(2),
    lineTotal: (l.quantity * l.unitAmount).toFixed(2),
    sourceType: l.sourceType ?? "manual",
    sourceId: l.sourceId,
  }));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  if (subtotal <= 0) return { ok: false, error: "Invoice total must be greater than zero." };

  // Verify the company is one the signed-in user owns (not soft-deleted).
  const [company] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.id, companyId),
        eq(companies.userId, session.user.id),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1);
  if (!company) return { ok: false, error: "Pick one of your companies." };

  // The form is an editable "Generate": the invoice carries the (possibly edited)
  // lines, but for an hourly company we still bill the underlying unbilled hours
  // so the same time can't be invoiced twice. The draft tells us which to stamp.
  const draft = await buildInvoiceDraft(company, session.user.id);

  // Discount (before tax) and tax are snapshotted onto the invoice from the
  // line subtotal + company config — never trusted from the client (DEV-116/118).
  const totals = computeInvoiceTotals(subtotal, company, discountParsed.discount);

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId: session.user.id,
      companyId,
      invoiceNumber,
      issueDate,
      dueDate,
      currency: company.currency,
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxLabel: totals.taxLabel,
      taxAmount: totals.taxAmount,
      amount: totals.amount,
      status: "draft",
      notes,
    })
    .returning({ id: invoices.id });

  await insertInvoiceLineItems(session.user.id, invoice.id, lines);

  // Partial billing (DEV-118): stamp ONLY the time entries whose lines made it
  // onto this invoice — and only ones the draft says are legitimately billable
  // (guards against a tampered sourceId). Dropping a time line leaves it unbilled.
  const draftIds = new Set(draft.billedEntryIds);
  const billedIds = lines
    .filter((l) => l.sourceType === "time" && l.sourceId && draftIds.has(l.sourceId))
    .map((l) => l.sourceId as string);
  if (billedIds.length > 0) {
    await db
      .update(timeEntries)
      .set({ billedAt: new Date(), billedInvoiceId: invoice.id })
      .where(inArray(timeEntries.id, billedIds));
  }

  // Same for milestones (DEV-119): mark invoiced only the pending milestones
  // whose lines were submitted (and are legitimately in the draft).
  const draftMilestoneIds = new Set(draft.billedMilestoneIds);
  const milestoneIds = lines
    .filter((l) => l.sourceType === "milestone" && l.sourceId && draftMilestoneIds.has(l.sourceId))
    .map((l) => l.sourceId as string);
  if (milestoneIds.length > 0) {
    await db
      .update(companyMilestones)
      .set({ status: "invoiced", invoicedInvoiceId: invoice.id })
      .where(inArray(companyMilestones.id, milestoneIds));
  }

  // Same for billable expenses (DEV-123): stamp only the ones whose lines were
  // submitted and are legitimately in the draft.
  const draftExpenseIds = new Set(draft.billedExpenseIds);
  const expenseIds = lines
    .filter((l) => l.sourceType === "expense" && l.sourceId && draftExpenseIds.has(l.sourceId))
    .map((l) => l.sourceId as string);
  if (expenseIds.length > 0) {
    await db
      .update(expenses)
      .set({ billedAt: new Date(), billedInvoiceId: invoice.id })
      .where(inArray(expenses.id, expenseIds));
  }

  revalidatePath("/account/invoices");
  revalidatePath("/account/companies");
  revalidatePath("/account/expenses");
  revalidatePath("/account");
  return { ok: true };
}

// Edit a DRAFT invoice's line items (add/edit/remove + reorder via submit order),
// discount, dates and notes; recompute the money breakdown (DEV-139). Tax config
// is re-read from the company; currency is kept as captured. Sent/paid invoices
// are locked. Line items are replaced (old ones soft-deleted). Does NOT re-stamp
// time entries / milestones — those were settled at create.
export async function updateInvoice(_prev: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const id = ((formData.get("id") as string) ?? "").trim();
  const issueDate = (formData.get("issueDate") as string)?.trim();
  const dueDate = (formData.get("dueDate") as string)?.trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  if (!id || !issueDate || !dueDate) {
    return { ok: false, error: "Invoice, issue date, and due date are required." };
  }
  if (dueDate < issueDate) {
    return { ok: false, error: "Due date can't be before the issue date." };
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id), isNull(invoices.deletedAt)))
    .limit(1);
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "draft") {
    return { ok: false, error: "Only draft invoices can be edited. Set it back to draft first." };
  }

  const parsed = parseLineItems((formData.get("lineItems") as string) ?? "");
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const discountParsed = parseDiscount(
    ((formData.get("discountType") as string) ?? "").trim(),
    ((formData.get("discountValue") as string) ?? "").trim(),
  );
  if ("error" in discountParsed) return { ok: false, error: discountParsed.error };

  const lines: DraftLineItem[] = parsed.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toFixed(2),
    unitAmount: l.unitAmount.toFixed(2),
    lineTotal: (l.quantity * l.unitAmount).toFixed(2),
    sourceType: l.sourceType ?? "manual",
    sourceId: l.sourceId,
  }));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  if (subtotal <= 0) return { ok: false, error: "Invoice total must be greater than zero." };

  // Tax config comes from the company (unchanged); currency stays as captured.
  // If the company is gone, fall back to the invoice's own snapshotted tax rate.
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, invoice.companyId ?? ""), eq(companies.userId, session.user.id)))
    .limit(1);
  const taxConfig = company
    ? { taxRate: company.taxRate, taxLabel: company.taxLabel, taxExempt: company.taxExempt }
    : { taxRate: invoice.taxRate, taxLabel: invoice.taxLabel, taxExempt: false };
  const totals = computeInvoiceTotals(subtotal, taxConfig, discountParsed.discount);

  await db
    .update(invoices)
    .set({
      issueDate,
      dueDate,
      notes,
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxLabel: totals.taxLabel,
      taxAmount: totals.taxAmount,
      amount: totals.amount,
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)));

  // Replace line items: soft-delete the old set, insert the new (submit order =
  // sort order, so move-up/down reordering persists).
  await db
    .update(invoiceLineItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(invoiceLineItems.invoiceId, id),
        eq(invoiceLineItems.userId, session.user.id),
        isNull(invoiceLineItems.deletedAt),
      ),
    );
  await insertInvoiceLineItems(session.user.id, id, lines);

  revalidatePath("/account/invoices");
  revalidatePath("/account");
  return { ok: true };
}

export async function updateInvoiceStatus(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !INVOICE_STATUSES.includes(status as InvoiceStatus)) return;

  await db
    .update(invoices)
    .set({ status })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)));
  revalidatePath("/account/invoices");
  revalidatePath("/account");
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = formData.get("id") as string;
  if (!id) return;

  await db
    .update(invoices)
    .set({ deletedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)));
  revalidatePath("/account/invoices");
  revalidatePath("/account");
}
