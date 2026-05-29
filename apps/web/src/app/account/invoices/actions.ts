"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, timeEntries, INVOICE_STATUSES, type InvoiceStatus } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { buildInvoiceDraft } from "@/lib/invoicing";

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
  const amountRaw = (formData.get("amount") as string)?.trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const amount = Number(amountRaw);

  if (!invoiceNumber || !companyId || !issueDate || !dueDate || !amountRaw) {
    return { ok: false, error: "Invoice #, company, dates, and amount are required." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be a positive number." };
  }
  if (dueDate < issueDate) {
    return { ok: false, error: "Due date can't be before the issue date." };
  }

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
  // form values, but for an hourly company we still bill the underlying unbilled
  // hours so the same time can't be invoiced twice (consistent with the Generate
  // button). The draft tells us which entries to stamp.
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
