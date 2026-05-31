"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { invoices, payments, PAYMENT_METHODS, type PaymentMethod } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type PaymentState = { ok: boolean; error?: string } | null;

const today = () => new Date().toISOString().slice(0, 10);

// Reconcile an invoice's status from its payments + credit notes (DEV-125/127):
// fully covered → "paid", partly covered → "partial", and a payment removal that
// drops coverage to zero reverts paid/partial back to "sent".
async function recomputeInvoiceStatus(userId: string, invoiceId: string) {
  const [inv] = await db
    .select({ amount: invoices.amount, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);
  if (!inv) return;

  const [{ paid }] = await db
    .select({ paid: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.invoiceId, invoiceId), isNull(payments.deletedAt)));
  const [{ credited }] = await db
    .select({ credited: sql<string>`coalesce(sum(${invoices.amount}), 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.creditedInvoiceId, invoiceId),
        eq(invoices.type, "credit_note"),
        eq(invoices.status, "issued"),
        isNull(invoices.deletedAt),
      ),
    );

  const covered = Number(paid) + Number(credited);
  const amount = Number(inv.amount);
  let status = inv.status;
  if (amount > 0 && covered >= amount - 0.005) status = "paid";
  else if (covered > 0) status = "partial";
  else if (inv.status === "paid" || inv.status === "partial") status = "sent";

  if (status !== inv.status) {
    await db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId));
  }
}

export async function recordPayment(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const invoiceId = ((formData.get("invoiceId") as string) ?? "").trim();
  const amountRaw = ((formData.get("amount") as string) ?? "").trim();
  const method = ((formData.get("method") as string) ?? "check").trim();
  const reference = ((formData.get("reference") as string) ?? "").trim() || null;
  const receivedDate = ((formData.get("receivedDate") as string) ?? "").trim() || today();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!invoiceId) return { ok: false, error: "Pick an invoice." };
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) return { ok: false, error: "Pick a method." };
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }

  // Verify the invoice belongs to the user (and is an invoice, not a quote/CN).
  const [inv] = await db
    .select({ id: invoices.id })
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
  if (!inv) return { ok: false, error: "Pick one of your invoices." };

  await db.insert(payments).values({
    userId: session.user.id,
    invoiceId,
    amount: amount.toFixed(2),
    method,
    reference,
    receivedDate,
    notes,
  });
  await recomputeInvoiceStatus(session.user.id, invoiceId);

  revalidatePath("/account/payments");
  revalidatePath("/account/invoices");
  revalidatePath("/account");
  return { ok: true };
}

export async function deletePayment(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  const invoiceId = (formData.get("invoiceId") as string)?.trim();
  if (!id) return;
  await db
    .update(payments)
    .set({ deletedAt: new Date() })
    .where(and(eq(payments.id, id), eq(payments.userId, session.user.id)));
  if (invoiceId) await recomputeInvoiceStatus(session.user.id, invoiceId);
  revalidatePath("/account/payments");
  revalidatePath("/account/invoices");
  revalidatePath("/account");
}
