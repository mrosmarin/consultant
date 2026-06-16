import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { businessSettings } from "@/db/schema";

export type BusinessSettings = typeof businessSettings.$inferSelect;

// Fallback issuer (matches the previous hardcoded invoice header) so invoices
// still render sensibly before the owner fills in /account/settings (DEV-148).
export const ISSUER_FALLBACK = {
  legalName: "EndlessWorlds, LLC",
  cityLine: "Levittown, NY",
} as const;

// The owner's business profile is a singleton per user — most recent active row.
// Fail-safe: if the query errors (e.g. the migration hasn't been applied to this
// environment yet), return null so invoice rendering falls back to the default
// issuer instead of breaking. This decouples the code deploy from migration timing.
export async function getBusinessSettings(
  userId: string,
): Promise<BusinessSettings | null> {
  try {
    const [row] = await db
      .select()
      .from(businessSettings)
      .where(and(eq(businessSettings.userId, userId), isNull(businessSettings.deletedAt)))
      .orderBy(desc(businessSettings.createdAt))
      .limit(1);
    return row ?? null;
  } catch (e) {
    console.error("getBusinessSettings failed; using fallback issuer:", e);
    return null;
  }
}

export function issuerLegalName(s: BusinessSettings | null): string {
  return s?.legalName?.trim() || ISSUER_FALLBACK.legalName;
}

export function issuerTaxId(s: BusinessSettings | null): string | null {
  return s?.taxId?.trim() || null;
}

// Address/contact lines for the issuer header — only the parts that are set.
export function issuerAddressLines(s: BusinessSettings | null): string[] {
  if (!s) return [ISSUER_FALLBACK.cityLine];
  const cityStateZip =
    [s.city, s.state].filter(Boolean).join(", ") + (s.postalCode ? ` ${s.postalCode}` : "");
  const lines = [
    s.addressLine1,
    s.addressLine2,
    cityStateZip.trim() || null,
    s.country,
    s.phone,
    s.email,
  ];
  const set = lines.filter((v): v is string => Boolean(v && v.trim()));
  return set.length ? set : [ISSUER_FALLBACK.cityLine];
}

// "How to pay" lines built from whatever payment methods the owner has set.
// Empty array when nothing is configured (callers show a sensible fallback).
export function paymentLines(s: BusinessSettings | null): string[] {
  if (!s) return [];
  const out: string[] = [];

  if (s.bankName || s.bankAccount || s.bankRouting || s.bankAccountName) {
    const parts = [
      s.bankName && `Bank: ${s.bankName}`,
      s.bankAccountName && `Account name: ${s.bankAccountName}`,
      s.bankRouting && `Routing: ${s.bankRouting}`,
      s.bankAccount && `Account: ${s.bankAccount}`,
    ].filter(Boolean);
    if (parts.length) out.push(`Bank transfer / ACH — ${parts.join(", ")}`);
  }

  if (s.checkPayableTo || s.checkMailingAddress) {
    const payable = s.checkPayableTo ? `payable to ${s.checkPayableTo}` : "";
    const mailTo = s.checkMailingAddress ? ` — mail to ${s.checkMailingAddress}` : "";
    out.push(`Check ${payable}${mailTo}`.replace(/\s+/g, " ").trim());
  }

  const online = [
    s.zelle && `Zelle: ${s.zelle}`,
    s.venmo && `Venmo: ${s.venmo}`,
    s.paypal && `PayPal: ${s.paypal}`,
    s.payLinkUrl && `Pay online: ${s.payLinkUrl}`,
  ].filter(Boolean) as string[];
  if (online.length) out.push(online.join(" · "));

  if (s.remitNote?.trim()) out.push(s.remitNote.trim());

  return out;
}

// Precomputed issuer block for rendering on an invoice (PDF + web view).
// A plain data shape so the PDF module needs only a type import (no db).
export type IssuerInfo = {
  legalName: string;
  addressLines: string[];
  taxId: string | null;
  paymentLines: string[];
};

export function issuerInfo(s: BusinessSettings | null): IssuerInfo {
  return {
    legalName: issuerLegalName(s),
    addressLines: issuerAddressLines(s),
    taxId: issuerTaxId(s),
    paymentLines: paymentLines(s),
  };
}
