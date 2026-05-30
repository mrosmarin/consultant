"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, timeEntries, INVOICE_STATUSES, type InvoiceStatus } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { buildInvoiceDraft, insertInvoiceLineItems, type DraftLineItem } from "@/lib/invoicing";

export type InvoiceState = { ok: boolean; error?: string } | null;

type ParsedLine = { description: string; quantity: number; unitAmount: number };

// Parse + validate the line-items JSON submitted by the form.
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
    const description = String((item as ParsedLine)?.description ?? "").trim();
    const quantity = Number((item as ParsedLine)?.quantity);
    const unitAmount = Number((item as ParsedLine)?.unitAmount);
    if (!description) return { error: "Every line item needs a description." };
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: "Line quantities must be positive numbers." };
    }
    if (!Number.isFinite(unitAmount) || unitAmount < 0) {
      return { error: "Line rates must be non-negative numbers." };
    }
    lines.push({ description, quantity, unitAmount });
  }
  return { lines };
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

  // Total is derived server-side from the lines (never trust a client total).
  const lines: DraftLineItem[] = parsed.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toFixed(2),
    unitAmount: l.unitAmount.toFixed(2),
    lineTotal: (l.quantity * l.unitAmount).toFixed(2),
    sourceType: "manual",
    sourceId: null,
  }));
  const amount = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  if (amount <= 0) return { ok: false, error: "Invoice total must be greater than zero." };

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

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId: session.user.id,
      companyId,
      invoiceNumber,
      issueDate,
      dueDate,
      amount: amount.toFixed(2),
      status: "draft",
      notes,
    })
    .returning({ id: invoices.id });

  await insertInvoiceLineItems(session.user.id, invoice.id, lines);

  if (draft.billedEntryIds.length > 0) {
    await db
      .update(timeEntries)
      .set({ billedAt: new Date(), billedInvoiceId: invoice.id })
      .where(inArray(timeEntries.id, draft.billedEntryIds));
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
