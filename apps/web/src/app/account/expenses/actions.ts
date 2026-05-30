"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, expenses, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type ExpenseState = { ok: boolean; error?: string } | null;

export async function addExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const projectId = ((formData.get("projectId") as string) ?? "").trim() || null;
  const expenseDate = (formData.get("expenseDate") as string)?.trim();
  const category = ((formData.get("category") as string) ?? "Other").trim();
  const amountRaw = ((formData.get("amount") as string) ?? "").trim();
  const billable = formData.get("billable") === "on" || formData.get("billable") === "true";
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const receiptKey = ((formData.get("receiptKey") as string) ?? "").trim() || null;

  if (!companyId || !expenseDate) return { ok: false, error: "Company and date are required." };
  if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
    return { ok: false, error: "Pick a valid category." };
  }
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }

  // Verify the company belongs to the user.
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(eq(companies.id, companyId), eq(companies.userId, session.user.id), isNull(companies.deletedAt)),
    )
    .limit(1);
  if (!company) return { ok: false, error: "Pick one of your companies." };

  await db.insert(expenses).values({
    userId: session.user.id,
    companyId,
    projectId,
    expenseDate,
    category,
    amount: amount.toFixed(2),
    billable,
    notes,
    receiptKey,
  });
  revalidatePath("/account/expenses");
  return { ok: true };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;
  // Don't allow removing an already-billed expense (it's on an invoice).
  await db
    .update(expenses)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(expenses.id, id), eq(expenses.userId, session.user.id), isNull(expenses.billedAt)),
    );
  revalidatePath("/account/expenses");
}
