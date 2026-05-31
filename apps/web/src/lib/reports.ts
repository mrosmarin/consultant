// Accounts-receivable aging (DEV-132). Pure functions — no DB — so the bucketing
// math is unit-testable. Amounts are kept per-currency (no FX; consistent with
// the multi-currency v1 decision). The caller assembles rows from the DB.

export type AgingInput = {
  companyId: string | null;
  companyName: string | null;
  currency: string;
  outstanding: number; // amount − credit notes − payments, > 0
  dueDate: string; // ISO yyyy-mm-dd
};

export const AGING_BUCKETS = ["current", "d1_30", "d31_60", "d61_90", "d90_plus"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export const AGING_LABELS: Record<AgingBucket, string> = {
  current: "Current",
  d1_30: "1–30",
  d31_60: "31–60",
  d61_90: "61–90",
  d90_plus: "90+",
};

const zero = (): Record<AgingBucket, number> => ({
  current: 0,
  d1_30: 0,
  d31_60: 0,
  d61_90: 0,
  d90_plus: 0,
});

// Whole days `dueDate` is past `today` (negative/zero ⇒ not yet due).
export function daysOverdue(dueDate: string, today: string): number {
  const d = Date.parse(`${dueDate}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  return Math.floor((t - d) / 86_400_000);
}

export function bucketFor(dueDate: string, today: string): AgingBucket {
  const n = daysOverdue(dueDate, today);
  if (n <= 0) return "current";
  if (n <= 30) return "d1_30";
  if (n <= 60) return "d31_60";
  if (n <= 90) return "d61_90";
  return "d90_plus";
}

export type AgingClientRow = {
  companyId: string | null;
  companyName: string;
  currency: string;
  buckets: Record<AgingBucket, number>;
  total: number;
};

export type AgingCurrencyGroup = {
  currency: string;
  clients: AgingClientRow[];
  totals: Record<AgingBucket, number>;
  total: number;
};

// Group outstanding invoices into per-currency tables, each broken down by
// client across the aging buckets, rounded to cents.
export function buildAgingReport(rows: AgingInput[], today: string): AgingCurrencyGroup[] {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  // currency -> companyKey -> row
  const byCur = new Map<string, Map<string, AgingClientRow>>();
  for (const inv of rows) {
    if (!(inv.outstanding > 0)) continue;
    const cur = inv.currency;
    const key = inv.companyId ?? `name:${inv.companyName ?? "—"}`;
    const clients = byCur.get(cur) ?? new Map();
    byCur.set(cur, clients);
    const row =
      clients.get(key) ??
      ({
        companyId: inv.companyId,
        companyName: inv.companyName ?? "—",
        currency: cur,
        buckets: zero(),
        total: 0,
      } as AgingClientRow);
    const b = bucketFor(inv.dueDate, today);
    row.buckets[b] += inv.outstanding;
    row.total += inv.outstanding;
    clients.set(key, row);
  }

  const groups: AgingCurrencyGroup[] = [];
  for (const [currency, clients] of byCur) {
    const totals = zero();
    let total = 0;
    const list = [...clients.values()].map((c) => {
      for (const b of AGING_BUCKETS) {
        c.buckets[b] = r2(c.buckets[b]);
        totals[b] += c.buckets[b];
      }
      c.total = r2(c.total);
      total += c.total;
      return c;
    });
    list.sort((a, b) => b.total - a.total);
    for (const b of AGING_BUCKETS) totals[b] = r2(totals[b]);
    groups.push({ currency, clients: list, totals, total: r2(total) });
  }
  groups.sort((a, b) => b.total - a.total);
  return groups;
}

// Revenue reporting (DEV-133). Invoiced revenue (issued invoice amounts,
// excluding drafts + credit notes) grouped by client and by month, per currency.
export type RevenueInput = {
  companyName: string | null;
  currency: string;
  amount: number;
  issueDate: string; // ISO yyyy-mm-dd
};

export type RevenueGroup = {
  currency: string;
  byClient: { name: string; total: number }[];
  byMonth: { month: string; total: number }[]; // YYYY-MM
  total: number;
};

export function buildRevenueReport(rows: RevenueInput[]): RevenueGroup[] {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const byCur = new Map<string, { client: Map<string, number>; month: Map<string, number>; total: number }>();
  for (const r of rows) {
    if (!(r.amount > 0)) continue;
    const g = byCur.get(r.currency) ?? { client: new Map(), month: new Map(), total: 0 };
    byCur.set(r.currency, g);
    const name = r.companyName ?? "—";
    const month = r.issueDate.slice(0, 7);
    g.client.set(name, (g.client.get(name) ?? 0) + r.amount);
    g.month.set(month, (g.month.get(month) ?? 0) + r.amount);
    g.total += r.amount;
  }
  const groups: RevenueGroup[] = [];
  for (const [currency, g] of byCur) {
    groups.push({
      currency,
      byClient: [...g.client.entries()].map(([name, t]) => ({ name, total: r2(t) })).sort((a, b) => b.total - a.total),
      byMonth: [...g.month.entries()].map(([month, t]) => ({ month, total: r2(t) })).sort((a, b) => a.month.localeCompare(b.month)),
      total: r2(g.total),
    });
  }
  groups.sort((a, b) => b.total - a.total);
  return groups;
}
