"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  companies,
  companyContacts,
  invoices,
  timeEntries,
  BILLING_TYPES,
  BILLING_FREQUENCIES,
  type BillingType,
  type BillingFrequency,
} from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { suggestInvoicePrefix } from "@/lib/billing";
import { buildInvoiceDraft, insertInvoiceLineItems } from "@/lib/invoicing";
import { DEFAULT_CURRENCY, isCurrency } from "@/lib/money";

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
  paymentTermsDays: number;
  invoicePrefix: string;
  currency: string;
  taxRate: string | null;
  taxLabel: string | null;
  taxExempt: boolean;
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
  const prefixRaw = ((formData.get("invoicePrefix") as string) ?? "").trim();
  const termsRaw = ((formData.get("paymentTermsDays") as string) ?? "").trim();
  const taxRateRaw = ((formData.get("taxRate") as string) ?? "").trim();
  const taxLabel = ((formData.get("taxLabel") as string) ?? "").trim() || null;
  const taxExempt = formData.get("taxExempt") === "on" || formData.get("taxExempt") === "true";
  const currencyRaw = ((formData.get("currency") as string) ?? "").trim().toUpperCase();
  const currency = currencyRaw ? (isCurrency(currencyRaw) ? currencyRaw : "") : DEFAULT_CURRENCY;

  if (!name) return { error: "Company name is required." };
  if (!currency) return { error: "Pick a supported currency." };
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

  // Net payment terms in days (0 = due on receipt); default 30.
  let paymentTermsDays = 30;
  if (termsRaw) {
    const t = Number(termsRaw);
    if (!Number.isInteger(t) || t < 0 || t > 365) {
      return { error: "Payment terms must be a whole number of days (0–365)." };
    }
    paymentTermsDays = t;
  }

  // Normalize the prefix (uppercase alphanumerics); fall back to a suggestion
  // from the name so generated invoice numbers always have a prefix.
  const cleanedPrefix = prefixRaw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const invoicePrefix = cleanedPrefix || suggestInvoicePrefix(name);

  // Optional default tax rate (percent, 0–100). Blank = no rate.
  let taxRate: string | null = null;
  if (taxRateRaw) {
    const r = Number(taxRateRaw);
    if (!Number.isFinite(r) || r < 0 || r > 100) {
      return { error: "Tax rate must be a percentage between 0 and 100." };
    }
    taxRate = String(r);
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
      paymentTermsDays,
      invoicePrefix,
      currency,
      taxRate,
      taxLabel,
      taxExempt,
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

  const [created] = await db
    .insert(companies)
    .values({ userId: session.user.id, ...parsed.values })
    .returning({ id: companies.id });
  // Seed the onboarding contact as the company's primary contact (DEV-110), so
  // the contacts list and the legacy single-contact fields stay in sync.
  if (created && (parsed.values.contactName || parsed.values.contactEmail)) {
    await db.insert(companyContacts).values({
      userId: session.user.id,
      companyId: created.id,
      name: parsed.values.contactName ?? parsed.values.contactEmail ?? "Primary contact",
      email: parsed.values.contactEmail,
      isPrimary: true,
    });
  }
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

export type GenerateInvoiceState =
  | { ok: true; invoiceNumber: string; amount: string }
  | { ok: false; error: string }
  | null;

// Generates a DRAFT invoice for a company's latest completed billing period.
// Hourly: sums all unbilled time entries up to the period end, marks them billed.
// Retainer: bills the flat retainer amount for the period. Returns the new number.
export async function generateInvoice(
  _prev: GenerateInvoiceState,
  formData: FormData,
): Promise<GenerateInvoiceState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  if (!companyId) return { ok: false, error: "Missing company." };

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
  if (!company) return { ok: false, error: "Company not found." };

  if (company.billingType === "hourly" && !company.hourlyRate) {
    return { ok: false, error: "Set an hourly rate on the company first." };
  }
  if (company.billingType === "retainer" && !company.retainerAmount) {
    return { ok: false, error: "Set a retainer amount on the company first." };
  }

  const draft = await buildInvoiceDraft(company, session.user.id);
  if (company.billingType === "hourly" && draft.hours <= 0) {
    return { ok: false, error: `No unbilled hours up to ${draft.periodEnd}.` };
  }

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId: session.user.id,
      companyId,
      invoiceNumber: draft.invoiceNumber,
      issueDate: draft.issueDate,
      dueDate: draft.dueDate,
      currency: draft.currency,
      subtotal: draft.subtotal,
      discountType: draft.discountType,
      discountValue: draft.discountValue,
      discountAmount: draft.discountAmount,
      taxRate: draft.taxRate,
      taxLabel: draft.taxLabel,
      taxAmount: draft.taxAmount,
      amount: draft.amount,
      status: "draft",
      notes: draft.notes,
    })
    .returning({ id: invoices.id });

  // Persist the draft's line items against the new invoice.
  await insertInvoiceLineItems(session.user.id, invoice.id, draft.lineItems);

  // Stamp the billed entries so they can't be billed again.
  if (draft.billedEntryIds.length > 0) {
    await db
      .update(timeEntries)
      .set({ billedAt: new Date(), billedInvoiceId: invoice.id })
      .where(inArray(timeEntries.id, draft.billedEntryIds));
  }

  revalidatePath("/account/invoices");
  revalidatePath("/account/companies");
  revalidatePath("/account");
  return { ok: true, invoiceNumber: draft.invoiceNumber, amount: draft.amount };
}
