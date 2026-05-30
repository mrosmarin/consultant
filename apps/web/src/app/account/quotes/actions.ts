"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, invoiceLineItems, QUOTE_STATUSES, type QuoteStatus } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { addDaysISO, suggestInvoicePrefix, NET_TERMS_DAYS } from "@/lib/billing";
import { computeInvoiceTotals, insertInvoiceLineItems, type DraftLineItem } from "@/lib/invoicing";
import { parseLineItems, parseDiscount } from "@/lib/invoice-input";

export type QuoteState = { ok: boolean; error?: string } | null;

const today = () => new Date().toISOString().slice(0, 10);

// Next per-company document number for a given type. Count includes soft-deleted
// so numbers are never reused. Quotes use a "-Q-" sequence, invoices a plain one.
async function nextNumber(companyId: string, prefix: string, type: "invoice" | "quote") {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), eq(invoices.type, type)));
  const seq = String((n ?? 0) + 1).padStart(4, "0");
  return type === "quote" ? `${prefix}-Q-${seq}` : `${prefix}-${seq}`;
}

async function ownedCompany(userId: string, companyId: string) {
  const [c] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.userId, userId), isNull(companies.deletedAt)))
    .limit(1);
  return c;
}

export async function createQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const issueDate = (formData.get("issueDate") as string)?.trim() || today();
  const validUntil = ((formData.get("validUntil") as string) ?? "").trim() || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  if (validUntil && validUntil < issueDate) {
    return { ok: false, error: "Valid-until date can't be before the issue date." };
  }

  const parsed = parseLineItems((formData.get("lineItems") as string) ?? "");
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const discountParsed = parseDiscount(
    ((formData.get("discountType") as string) ?? "").trim(),
    ((formData.get("discountValue") as string) ?? "").trim(),
  );
  if ("error" in discountParsed) return { ok: false, error: discountParsed.error };

  const company = await ownedCompany(session.user.id, companyId);
  if (!company) return { ok: false, error: "Pick one of your companies." };

  const lines: DraftLineItem[] = parsed.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toFixed(2),
    unitAmount: l.unitAmount.toFixed(2),
    lineTotal: (l.quantity * l.unitAmount).toFixed(2),
    sourceType: l.sourceType ?? "manual",
    sourceId: l.sourceId,
  }));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  if (subtotal <= 0) return { ok: false, error: "Quote total must be greater than zero." };

  const totals = computeInvoiceTotals(subtotal, company, discountParsed.discount);
  const number = await nextNumber(companyId, company.invoicePrefix || suggestInvoicePrefix(company.name), "quote");

  const [quote] = await db
    .insert(invoices)
    .values({
      userId: session.user.id,
      companyId,
      type: "quote",
      invoiceNumber: number,
      issueDate,
      // Quotes have no payment due date; satisfy the not-null column with the
      // expiry (or the issue date). `valid_until` is the real expiry field.
      dueDate: validUntil ?? issueDate,
      validUntil,
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

  await insertInvoiceLineItems(session.user.id, quote.id, lines);
  revalidatePath("/account/quotes");
  return { ok: true };
}

export async function updateQuoteStatus(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  const status = (formData.get("status") as string)?.trim();
  if (!id || !QUOTE_STATUSES.includes(status as QuoteStatus)) return;
  await db
    .update(invoices)
    .set({ status })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id), eq(invoices.type, "quote")));
  revalidatePath("/account/quotes");
}

export async function deleteQuote(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;
  await db
    .update(invoices)
    .set({ deletedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id), eq(invoices.type, "quote")));
  revalidatePath("/account/quotes");
}

// Convert an accepted quote into a draft invoice: copy its agreed money snapshot
// + line items into a new invoice, link them, and mark the quote accepted.
export async function convertQuoteToInvoice(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;

  const [quote] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.userId, session.user.id),
        eq(invoices.type, "quote"),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);
  if (!quote || !quote.companyId) return;

  // Already converted? Don't create a duplicate.
  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.sourceQuoteId, id), isNull(invoices.deletedAt)))
    .limit(1);
  if (existing) {
    redirect("/account/invoices");
  }

  const company = await ownedCompany(session.user.id, quote.companyId);
  const prefix = company?.invoicePrefix || "INV";
  const number = await nextNumber(quote.companyId, prefix, "invoice");
  const issue = today();
  const due = addDaysISO(issue, company?.paymentTermsDays ?? NET_TERMS_DAYS);

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId: session.user.id,
      companyId: quote.companyId,
      type: "invoice",
      sourceQuoteId: quote.id,
      invoiceNumber: number,
      issueDate: issue,
      dueDate: due,
      currency: quote.currency,
      subtotal: quote.subtotal,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      discountAmount: quote.discountAmount,
      taxRate: quote.taxRate,
      taxLabel: quote.taxLabel,
      taxAmount: quote.taxAmount,
      amount: quote.amount,
      status: "draft",
      notes: quote.notes,
    })
    .returning({ id: invoices.id });

  const quoteLines = await db
    .select()
    .from(invoiceLineItems)
    .where(and(eq(invoiceLineItems.invoiceId, id), isNull(invoiceLineItems.deletedAt)))
    .orderBy(invoiceLineItems.sortOrder);
  await insertInvoiceLineItems(
    session.user.id,
    invoice.id,
    quoteLines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitAmount: l.unitAmount,
      lineTotal: l.lineTotal,
      sourceType: "manual", // de-link from time/milestone sources on the invoice copy
      sourceId: null,
    })),
  );

  await db
    .update(invoices)
    .set({ status: "accepted" })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)));

  revalidatePath("/account/quotes");
  revalidatePath("/account/invoices");
  redirect("/account/invoices");
}
