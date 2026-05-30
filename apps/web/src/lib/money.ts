// Currency formatting shared by server + client (no "server-only" — used in both).
// Multi-currency (DEV-117): amounts are stored in the invoice's own currency; we
// never convert (no FX in v1). Format strictly by that currency code.

// ISO 4217 codes offered in the UI. Extend as clients need more.
export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "INR",
  "MXN",
  "BRL",
  "ZAR",
  "SGD",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

export function isCurrency(code: string): code is Currency {
  return (CURRENCIES as readonly string[]).includes(code);
}

// Format a numeric value (or numeric string) as money in the given currency.
// Falls back to USD for an unknown/blank code so we never throw on render.
export function formatMoney(value: number | string, currency?: string | null): string {
  const amount = typeof value === "string" ? Number(value) : value;
  const code = currency && isCurrency(currency) ? currency : DEFAULT_CURRENCY;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}
