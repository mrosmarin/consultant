"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, CREDIT_NOTE_STATUSES, type CreditNoteStatus } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { suggestInvoicePrefix } from "@/lib/billing";
import { computeInvoiceTotals, insertInvoiceLineItems, type DraftLineItem } from "@/lib/invoicing";
import { parseLineItems } from "@/lib/invoice-input";

export type CreditNoteState = { ok: boolean; error?: string } | null;

const today = () => new Date().toISOString().slice(0, 10);

async function nextCreditNoteNumber(companyId: string, prefix: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), eq(invoices.type, "credit_note")));
  return `${prefix}-CN-${String((n ?? 0) + 1).padStart(4, "0")}`;
}

export async function createCreditNote(
  _prev: CreditNoteState,
  formData: FormData,
): Promise<CreditNoteState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const invoiceId = ((formData.get("invoiceId") as string) ?? "").trim();
  const reason = ((formData.get("notes") as string) ?? "").trim() || null;

  const parsed = parseLineItems((formData.get("lineItems") as string) ?? "");
  if ("error" in parsed) return { ok: false, error: parsed.error };

  // The invoice being credited (must be one the user owns).
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.userId, session.user.id),
        eq(invoices.type, "invoice"),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);
  if (!invoice || !invoice.companyId) return { ok: false, error: "Pick one of your invoices." };

  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, invoice.companyId), eq(companies.userId, session.user.id)))
    .limit(1);

  const lines: DraftLineItem[] = parsed.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toFixed(2),
    unitAmount: l.unitAmount.toFixed(2),
    lineTotal: (l.quantity * l.unitAmount).toFixed(2),
    sourceType: "manual",
    sourceId: null,
  }));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  if (subtotal <= 0) return { ok: false, error: "Credit total must be greater than zero." };

  // Tax mirrors the credited invoice's company; no discount on credit notes.
  const taxConfig = company
    ? { taxRate: company.taxRate, taxLabel: company.taxLabel, taxExempt: company.taxExempt }
    : { taxRate: invoice.taxRate, taxLabel: invoice.taxLabel, taxExempt: false };
  const totals = computeInvoiceTotals(subtotal, taxConfig, null);
  const prefix = company?.invoicePrefix || suggestInvoicePrefix(invoice.client ?? "INV");
  const number = await nextCreditNoteNumber(invoice.companyId, prefix);

  const [cn] = await db
    .insert(invoices)
    .values({
      userId: session.user.id,
      companyId: invoice.companyId,
      type: "credit_note",
      creditedInvoiceId: invoice.id,
      invoiceNumber: number,
      issueDate: today(),
      dueDate: today(),
      currency: invoice.currency,
      subtotal: totals.subtotal,
      taxRate: totals.taxRate,
      taxLabel: totals.taxLabel,
      taxAmount: totals.taxAmount,
      amount: totals.amount,
      status: "issued",
      notes: reason,
    })
    .returning({ id: invoices.id });

  await insertInvoiceLineItems(session.user.id, cn.id, lines);
  revalidatePath("/account/credit-notes");
  revalidatePath("/account/invoices");
  return { ok: true };
}

export async function updateCreditNoteStatus(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  const status = (formData.get("status") as string)?.trim();
  if (!id || !CREDIT_NOTE_STATUSES.includes(status as CreditNoteStatus)) return;
  await db
    .update(invoices)
    .set({ status })
    .where(
      and(eq(invoices.id, id), eq(invoices.userId, session.user.id), eq(invoices.type, "credit_note")),
    );
  revalidatePath("/account/credit-notes");
  revalidatePath("/account/invoices");
}

export async function deleteCreditNote(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;
  await db
    .update(invoices)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(invoices.id, id), eq(invoices.userId, session.user.id), eq(invoices.type, "credit_note")),
    );
  revalidatePath("/account/credit-notes");
  revalidatePath("/account/invoices");
}
