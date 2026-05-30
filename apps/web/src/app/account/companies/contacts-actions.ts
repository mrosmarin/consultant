"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, companyContacts } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type ContactState = { ok: boolean; error?: string } | null;

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

const revalidate = (companyId: string) =>
  revalidatePath(`/account/companies/${companyId}/edit`);

export async function addContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const name = ((formData.get("name") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim() || null;
  const phone = ((formData.get("phone") as string) ?? "").trim() || null;
  const role = ((formData.get("role") as string) ?? "").trim() || null;
  const isPrimary = formData.get("isPrimary") === "true";

  if (!companyId || !(await ownsCompany(session.user.id, companyId))) {
    return { ok: false, error: "Pick one of your companies." };
  }
  if (!name) return { ok: false, error: "Contact name is required." };

  // A new primary demotes any existing primary for the company.
  if (isPrimary) {
    await db
      .update(companyContacts)
      .set({ isPrimary: false })
      .where(
        and(eq(companyContacts.companyId, companyId), eq(companyContacts.userId, session.user.id)),
      );
  }

  await db.insert(companyContacts).values({
    userId: session.user.id,
    companyId,
    name,
    email,
    phone,
    role,
    isPrimary,
  });
  revalidate(companyId);
  return { ok: true };
}

export async function deleteContact(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  const companyId = (formData.get("companyId") as string)?.trim();
  if (!id) return;
  await db
    .update(companyContacts)
    .set({ deletedAt: new Date() })
    .where(and(eq(companyContacts.id, id), eq(companyContacts.userId, session.user.id)));
  if (companyId) revalidate(companyId);
}

export async function setPrimaryContact(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = (formData.get("id") as string)?.trim();
  const companyId = (formData.get("companyId") as string)?.trim();
  if (!id || !companyId) return;

  // Demote all, then promote the chosen one (scoped to the owner + company).
  await db
    .update(companyContacts)
    .set({ isPrimary: false })
    .where(
      and(eq(companyContacts.companyId, companyId), eq(companyContacts.userId, session.user.id)),
    );
  await db
    .update(companyContacts)
    .set({ isPrimary: true })
    .where(and(eq(companyContacts.id, id), eq(companyContacts.userId, session.user.id)));
  revalidate(companyId);
}
