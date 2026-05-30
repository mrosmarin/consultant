"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, timeEntries, INVOICE_STATUSES, type InvoiceStatus } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import {
  buildInvoiceDraft,
  computeInvoiceTotals,
  insertInvoiceLineItems,
  type DiscountInput,
  type DraftLineItem,
} from "@/lib/invoicing";

export type InvoiceState = { ok: boolean; error?: string } | null;

type ParsedLine = {
  description: string;
  quantity: number;
  unitAmount: number;
  sourceType: string | null;
  sourceId: string | null;
};

// Parse + validate the line-items JSON submitted by the form. Each line may
// carry sourceType/sourceId (a time entry it came from) — used for partial
// billing: only the entries whose lines survive get stamped billed.
function parseLineItems(raw: string): { lines: ParsedLine[] } | { error: string } {
  let arr: unknown;
  try {
    arr = JSON.parse(raw || "[]");
  } catch {
    return { error: "Couldn't read the line items." };
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return { error: "Add at least one line item." };
  }
  const lines: ParsedLine[] = [];
  for (const item of arr) {
    const row = item as Record<string, unknown>;
    const description = String(row?.description ?? "").trim();
    const quantity = Number(row?.quantity);
    const unitAmount = Number(row?.unitAmount);
    if (!description) return { error: "Every line item needs a description." };
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: "Line quantities must be positive numbers." };
    }
    if (!Number.isFinite(unitAmount) || unitAmount < 0) {
      return { error: "Line rates must be non-negative numbers." };
    }
    const sourceType = row?.sourceType ? String(row.sourceType) : null;
    const sourceId = row?.sourceId ? String(row.sourceId) : null;
    lines.push({ description, quantity, unitAmount, sourceType, sourceId });
  }
  return { lines };
}

// Parse the optional invoice-level discount from the form.
function parseDiscount(
  typeRaw: string,
  valueRaw: string,
): { discount: DiscountInput } | { error: string } {
  if ((typeRaw !== "percent" && typeRaw !== "fixed") || !valueRaw) return { discount: null };
  const value = Number(valueRaw);
  if (!Number.isFinite(value) || value < 0) {
    return { error: "Discount must be a non-negative number." };
  }
  if (typeRaw === "percent" && value > 100) {
    return { error: "A percentage discount can't exceed 100%." };
  }
  return { discount: value > 0 ? { type: typeRaw, value } : null };
}

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

  revalidatePath("/account/invoices");
  revalidatePath("/account/companies");
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
