"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices, INVOICE_STATUSES, type InvoiceStatus } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type InvoiceState = { ok: boolean; error?: string } | null;

export async function createInvoice(
  _prev: InvoiceState,
  formData: FormData,
): Promise<InvoiceState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const invoiceNumber = (formData.get("invoiceNumber") as string)?.trim();
  const client = (formData.get("client") as string)?.trim();
  const issueDate = (formData.get("issueDate") as string)?.trim();
  const dueDate = (formData.get("dueDate") as string)?.trim();
  const amountRaw = (formData.get("amount") as string)?.trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const amount = Number(amountRaw);

  if (!invoiceNumber || !client || !issueDate || !dueDate || !amountRaw) {
    return { ok: false, error: "Invoice #, client, dates, and amount are required." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be a positive number." };
  }
  if (dueDate < issueDate) {
    return { ok: false, error: "Due date can't be before the issue date." };
  }

  await db.insert(invoices).values({
    userId: session.user.id,
    invoiceNumber,
    client,
    issueDate,
    dueDate,
    amount: amount.toFixed(2),
    notes,
  });
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
