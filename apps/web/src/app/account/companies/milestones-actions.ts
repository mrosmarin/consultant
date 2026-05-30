"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, companyMilestones } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type MilestoneState = { ok: boolean; error?: string } | null;

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const [c] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(eq(companies.id, companyId), eq(companies.userId, userId), isNull(companies.deletedAt)),
    )
    .limit(1);
  return Boolean(c);
}

const revalidate = (companyId: string) => revalidatePath(`/account/companies/${companyId}/edit`);

export async function addMilestone(
  _prev: MilestoneState,
  formData: FormData,
): Promise<MilestoneState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const name = ((formData.get("name") as string) ?? "").trim();
  const amountRaw = ((formData.get("amount") as string) ?? "").trim();
  const dueDate = ((formData.get("dueDate") as string) ?? "").trim() || null;

  if (!companyId || !(await ownsCompany(session.user.id, companyId))) {
    return { ok: false, error: "Pick one of your companies." };
  }
  if (!name) return { ok: false, error: "Milestone name is required." };
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Milestone amount must be greater than zero." };
  }

  await db.insert(companyMilestones).values({
    userId: session.user.id,
    companyId,
    name,
    amount: amount.toFixed(2),
    dueDate,
    status: "pending",
  });
  revalidate(companyId);
  return { ok: true };
}

export async function deleteMilestone(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  const companyId = (formData.get("companyId") as string)?.trim();
  if (!id) return;
  // Only pending milestones can be removed — invoiced ones are part of an invoice.
  await db
    .update(companyMilestones)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(companyMilestones.id, id),
        eq(companyMilestones.userId, session.user.id),
        eq(companyMilestones.status, "pending"),
      ),
    );
  if (companyId) revalidate(companyId);
}
