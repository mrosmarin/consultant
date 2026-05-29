"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  companies,
  BILLING_TYPES,
  BILLING_FREQUENCIES,
  type BillingType,
  type BillingFrequency,
} from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type CompanyState = { ok: boolean; error?: string } | null;

type ParsedCompany = {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  address: string | null;
  notes: string | null;
  billingType: BillingType;
  hourlyRate: string | null;
  retainerAmount: string | null;
  billingFrequency: BillingFrequency;
  billingAnchorDay: number | null;
};

function parseCompany(formData: FormData): { values: ParsedCompany } | { error: string } {
  const name = (formData.get("name") as string)?.trim();
  const contactName = ((formData.get("contactName") as string) ?? "").trim() || null;
  const contactEmail = ((formData.get("contactEmail") as string) ?? "").trim() || null;
  const address = ((formData.get("address") as string) ?? "").trim() || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const billingType = (formData.get("billingType") as string)?.trim() as BillingType;
  const billingFrequency = (formData.get("billingFrequency") as string)?.trim() as BillingFrequency;
  const rateRaw = ((formData.get("hourlyRate") as string) ?? "").trim();
  const retainerRaw = ((formData.get("retainerAmount") as string) ?? "").trim();
  const anchorRaw = ((formData.get("billingAnchorDay") as string) ?? "").trim();

  if (!name) return { error: "Company name is required." };
  if (!BILLING_TYPES.includes(billingType)) return { error: "Pick a billing type." };
  if (!BILLING_FREQUENCIES.includes(billingFrequency)) return { error: "Pick a billing frequency." };

  let hourlyRate: string | null = null;
  let retainerAmount: string | null = null;

  if (billingType === "hourly") {
    const rate = Number(rateRaw);
    if (!rateRaw || !Number.isFinite(rate) || rate <= 0) {
      return { error: "An hourly rate greater than 0 is required for hourly billing." };
    }
    hourlyRate = rate.toFixed(2);
  } else {
    const retainer = Number(retainerRaw);
    if (!retainerRaw || !Number.isFinite(retainer) || retainer <= 0) {
      return { error: "A retainer amount greater than 0 is required for retainer billing." };
    }
    retainerAmount = retainer.toFixed(2);
  }

  let billingAnchorDay: number | null = null;
  if (anchorRaw) {
    const anchor = Number(anchorRaw);
    if (!Number.isInteger(anchor) || anchor < 0 || anchor > 31) {
      return { error: "Billing anchor day must be a whole number (0–31)." };
    }
    billingAnchorDay = anchor;
  }

  return {
    values: {
      name,
      contactName,
      contactEmail,
      address,
      notes,
      billingType,
      hourlyRate,
      retainerAmount,
      billingFrequency,
      billingAnchorDay,
    },
  };
}

// Creates a company when no `id` is present, otherwise updates the owned row.
// Update redirects back to the list; create returns ok so the inline form can
// reset and the list (same page) revalidates.
export async function saveCompany(_prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const parsed = parseCompany(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const id = ((formData.get("id") as string) ?? "").trim();

  if (id) {
    await db
      .update(companies)
      .set(parsed.values)
      .where(and(eq(companies.id, id), eq(companies.userId, session.user.id)));
    revalidatePath("/account/companies");
    redirect("/account/companies");
  }

  await db.insert(companies).values({ userId: session.user.id, ...parsed.values });
  revalidatePath("/account/companies");
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteCompany(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = formData.get("id") as string;
  if (!id) return;

  await db
    .update(companies)
    .set({ deletedAt: new Date() })
    .where(and(eq(companies.id, id), eq(companies.userId, session.user.id)));
  revalidatePath("/account/companies");
  revalidatePath("/account");
}
