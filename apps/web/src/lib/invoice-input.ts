// Pure parsing/validation for the document forms (invoices + quotes). Kept out
// of the "use server" action files so both can import it (a server-action module
// may only export async functions). No DB access.
import type { DiscountInput } from "./invoicing";

export type ParsedLine = {
  description: string;
  quantity: number;
  unitAmount: number;
  sourceType: string | null;
  sourceId: string | null;
};

// Parse + validate the line-items JSON submitted by a document form. Each line
// may carry sourceType/sourceId (e.g. a time entry or milestone) — used for
// partial billing on invoices.
export function parseLineItems(raw: string): { lines: ParsedLine[] } | { error: string } {
  let arr: unknown;
  try {
    arr = JSON.parse(raw || "[]");
  } catch {
    return { error: "Couldn't read the line items." };
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return { error: "Add at least one line item." };
  }
  const lines: ParsedLine[] = [];
  for (const item of arr) {
    const row = item as Record<string, unknown>;
    const description = String(row?.description ?? "").trim();
    const quantity = Number(row?.quantity);
    const unitAmount = Number(row?.unitAmount);
    if (!description) return { error: "Every line item needs a description." };
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: "Line quantities must be positive numbers." };
    }
    if (!Number.isFinite(unitAmount) || unitAmount < 0) {
      return { error: "Line rates must be non-negative numbers." };
    }
    const sourceType = row?.sourceType ? String(row.sourceType) : null;
    const sourceId = row?.sourceId ? String(row.sourceId) : null;
    lines.push({ description, quantity, unitAmount, sourceType, sourceId });
  }
  return { lines };
}

// Parse the optional document-level discount from a form.
export function parseDiscount(
  typeRaw: string,
  valueRaw: string,
): { discount: DiscountInput } | { error: string } {
  if ((typeRaw !== "percent" && typeRaw !== "fixed") || !valueRaw) return { discount: null };
  const value = Number(valueRaw);
  if (!Number.isFinite(value) || value < 0) {
    return { error: "Discount must be a non-negative number." };
  }
  if (typeRaw === "percent" && value > 100) {
    return { error: "A percentage discount can't exceed 100%." };
  }
  return { discount: value > 0 ? { type: typeRaw, value } : null };
}
