// Billing-period math for invoice generation. Pure + UTC-based so it's testable
// and deploy-environment independent. A "period" is the most recent COMPLETED
// window for a company's billing frequency, relative to a reference date.

export type BillingPeriod = { start: string; end: string }; // inclusive ISO dates (YYYY-MM-DD)

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return utc(y, m - 1, d);
};
const addDays = (d: Date, n: number) => utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n);
const lastOfMonth = (y: number, m: number) => utc(y, m + 1, 0).getUTCDate();

// Most recent completed period ending strictly before `ref` (default today).
// anchorDay: weekly/biweekly → day-of-week (0=Sun..6=Sat); monthly/semimonthly →
// day-of-month (1..28). Sensible defaults when null.
export function latestCompletedPeriod(
  frequency: string,
  anchorDay: number | null,
  ref: string,
): BillingPeriod {
  const today = parse(ref);

  if (frequency === "weekly" || frequency === "biweekly") {
    const startDow = anchorDay ?? 1; // default Monday
    // Find the start of the week-window containing `today`.
    const dow = today.getUTCDay();
    const backToStart = (dow - startDow + 7) % 7;
    const currentStart = addDays(today, -backToStart);
    const span = frequency === "weekly" ? 7 : 14;
    // The completed period is the one immediately before the current window.
    const end = addDays(currentStart, -1);
    const start = addDays(currentStart, -span);
    return { start: iso(start), end: iso(end) };
  }

  if (frequency === "semimonthly") {
    // Windows: 1st–15th and 16th–end-of-month. Return the most recently completed.
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth();
    const day = today.getUTCDate();
    if (day <= 15) {
      // Current window is 1–15 (in progress) → last completed is prior month's 16–end.
      const py = m === 0 ? y - 1 : y;
      const pm = m === 0 ? 11 : m - 1;
      return { start: iso(utc(py, pm, 16)), end: iso(utc(py, pm, lastOfMonth(py, pm))) };
    }
    // Current window is 16–end (in progress) → last completed is this month's 1–15.
    return { start: iso(utc(y, m, 1)), end: iso(utc(y, m, 15)) };
  }

  // monthly (default): the previous full calendar month, or an anchor-day window.
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  if (anchorDay && anchorDay >= 1 && anchorDay <= 28) {
    // Windows run anchorDay → (anchorDay-1) next month.
    const currentStart =
      today.getUTCDate() >= anchorDay ? utc(y, m, anchorDay) : utc(y, m - 1, anchorDay);
    const end = addDays(currentStart, -1);
    const start = utc(
      currentStart.getUTCFullYear(),
      currentStart.getUTCMonth() - 1,
      anchorDay,
    );
    return { start: iso(start), end: iso(end) };
  }
  const py = m === 0 ? y - 1 : y;
  const pm = m === 0 ? 11 : m - 1;
  return { start: iso(utc(py, pm, 1)), end: iso(utc(py, pm, lastOfMonth(py, pm))) };
}

// Default net terms (days) for a generated invoice's due date.
export const NET_TERMS_DAYS = 30;

export function addDaysISO(dateISO: string, days: number): string {
  return iso(addDays(parse(dateISO), days));
}

// Suggest an invoice prefix from a company name: uppercase alphanumerics, first
// word-ish, capped. "Acme Corp, LLC" → "ACME". Empty → "INV".
export function suggestInvoicePrefix(name: string): string {
  const cleaned = (name || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "");
  const first = cleaned.trim().split(/\s+/)[0] ?? "";
  return (first || "INV").slice(0, 6);
}
