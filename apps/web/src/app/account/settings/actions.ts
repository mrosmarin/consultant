"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { businessSettings, INVOICE_DELETE_MODES } from "@/db/schema";
import { getAccess } from "@/lib/auth/rbac";

export type SettingsState = { ok: boolean; error?: string } | null;

// Save the owner's business/invoice-issuer profile (DEV-148). Admin-gated
// server-side (the page being admin-only is not the enforcement). Singleton per
// owner: update the existing active row, else insert one.
export async function saveBusinessSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const access = await getAccess();
  if (!access || access.role !== "admin") return { ok: false, error: "Admins only." };

  const get = (f: string) => {
    const v = ((formData.get(f) as string) ?? "").trim();
    return v || null;
  };

  const values = {
    legalName: get("legalName"),
    contactName: get("contactName"),
    addressLine1: get("addressLine1"),
    addressLine2: get("addressLine2"),
    city: get("city"),
    state: get("state"),
    postalCode: get("postalCode"),
    country: get("country"),
    email: get("email"),
    phone: get("phone"),
    taxId: get("taxId"),
    bankName: get("bankName"),
    bankRouting: get("bankRouting"),
    bankAccount: get("bankAccount"),
    bankAccountName: get("bankAccountName"),
    checkPayableTo: get("checkPayableTo"),
    checkMailingAddress: get("checkMailingAddress"),
    zelle: get("zelle"),
    venmo: get("venmo"),
    paypal: get("paypal"),
    payLinkUrl: get("payLinkUrl"),
    remitNote: get("remitNote"),
    // Validated enum (NOT NULL, default block) — never null (DEV-155).
    invoiceDeleteProtection: (INVOICE_DELETE_MODES as readonly string[]).includes(
      (formData.get("invoiceDeleteProtection") as string) ?? "",
    )
      ? (formData.get("invoiceDeleteProtection") as string)
      : "block",
  };

  const [existing] = await db
    .select({ id: businessSettings.id })
    .from(businessSettings)
    .where(and(eq(businessSettings.userId, access.user.id), isNull(businessSettings.deletedAt)))
    .limit(1);

  if (existing) {
    await db
      .update(businessSettings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(businessSettings.id, existing.id));
  } else {
    await db.insert(businessSettings).values({ userId: access.user.id, ...values });
  }

  revalidatePath("/account/settings");
  return { ok: true };
}
