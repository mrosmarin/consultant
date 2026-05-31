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

// Tax summary (DEV-135). Tax collected on issued invoices, grouped by tax
// label/rate and by month, per currency. taxable = subtotal − discount (the
// base tax was computed on); tax = tax_amount. Only rows with tax > 0 count.
export type TaxInput = {
  currency: string;
  taxLabel: string | null;
  taxRate: string | null;
  taxable: number;
  tax: number;
  issueDate: string; // ISO yyyy-mm-dd
};

export type TaxGroup = {
  currency: string;
  byLabel: { label: string; taxable: number; tax: number }[];
  byMonth: { month: string; taxable: number; tax: number }[];
  totalTaxable: number;
  totalTax: number;
};

export function buildTaxReport(rows: TaxInput[]): TaxGroup[] {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  type Acc = { taxable: number; tax: number };
  const byCur = new Map<string, { label: Map<string, Acc>; month: Map<string, Acc>; tT: number; tX: number }>();
  for (const r of rows) {
    if (!(r.tax > 0)) continue;
    const g = byCur.get(r.currency) ?? { label: new Map(), month: new Map(), tT: 0, tX: 0 };
    byCur.set(r.currency, g);
    const label = `${r.taxLabel?.trim() || "Tax"} (${Number(r.taxRate ?? 0)}%)`;
    const month = r.issueDate.slice(0, 7);
    const add = (m: Map<string, Acc>, k: string) => {
      const a = m.get(k) ?? { taxable: 0, tax: 0 };
      a.taxable += r.taxable;
      a.tax += r.tax;
      m.set(k, a);
    };
    add(g.label, label);
    add(g.month, month);
    g.tT += r.taxable;
    g.tX += r.tax;
  }
  const groups: TaxGroup[] = [];
  for (const [currency, g] of byCur) {
    groups.push({
      currency,
      byLabel: [...g.label.entries()]
        .map(([label, a]) => ({ label, taxable: r2(a.taxable), tax: r2(a.tax) }))
        .sort((a, b) => b.tax - a.tax),
      byMonth: [...g.month.entries()]
        .map(([month, a]) => ({ month, taxable: r2(a.taxable), tax: r2(a.tax) }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      totalTaxable: r2(g.tT),
      totalTax: r2(g.tX),
    });
  }
  groups.sort((a, b) => b.totalTax - a.totalTax);
  return groups;
}

// Time utilization (DEV-134): billable vs non-billable hours + realization rate,
// overall and by month. Currency-free (hours). Profit margin needs a labor-cost
// model we don't track yet — deferred.
export type UtilizationInput = { workDate: string; hours: number; billable: boolean };

export type UtilizationRow = {
  month: string;
  billable: number;
  nonBillable: number;
  total: number;
  pct: number; // billable / total * 100
};

export type UtilizationReport = {
  billable: number;
  nonBillable: number;
  total: number;
  pct: number;
  byMonth: UtilizationRow[];
};

export function buildUtilizationReport(rows: UtilizationInput[]): UtilizationReport {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const pctOf = (b: number, t: number) => (t > 0 ? Math.round((b / t) * 1000) / 10 : 0);
  const month = new Map<string, { b: number; n: number }>();
  let billable = 0;
  let nonBillable = 0;
  for (const r of rows) {
    const h = Number(r.hours) || 0;
    if (h <= 0) continue;
    const m = month.get(r.workDate.slice(0, 7)) ?? { b: 0, n: 0 };
    if (r.billable) {
      billable += h;
      m.b += h;
    } else {
      nonBillable += h;
      m.n += h;
    }
    month.set(r.workDate.slice(0, 7), m);
  }
  const total = billable + nonBillable;
  const byMonth = [...month.entries()]
    .map(([mo, v]) => ({
      month: mo,
      billable: r1(v.b),
      nonBillable: r1(v.n),
      total: r1(v.b + v.n),
      pct: pctOf(v.b, v.b + v.n),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
  return { billable: r1(billable), nonBillable: r1(nonBillable), total: r1(total), pct: pctOf(billable, total), byMonth };
}

// Timesheet reporting (DEV-74): aggregate logged time into a client-ready report.
// Pure (no DB) so the rollups are unit-testable; the route assembles the rows
// (already filtered by date range / company / project) and shares the result
// across the on-screen report, the CSV export, and the branded PDF. Amount =
// Σ(billable hours × snapshotted rate), kept per-currency (no FX — consistent
// with the multi-currency v1 decision). Non-billable time is tracked but earns 0.
export type TimesheetInput = {
  workDate: string; // ISO yyyy-mm-dd
  companyName: string | null;
  projectName: string | null;
  task: string | null;
  hours: number;
  rate: number | null;
  billable: boolean;
  currency: string;
};

export type TimesheetProjectRow = {
  companyName: string;
  projectName: string;
  currency: string;
  hours: number;
  billableHours: number;
  amount: number;
};

export type TimesheetMonthRow = {
  month: string;
  hours: number;
  billableHours: number;
};

export type TimesheetReport = {
  hours: number;
  billableHours: number;
  nonBillableHours: number;
  pct: number; // billable / total * 100
  entryCount: number;
  amountByCurrency: { currency: string; amount: number }[];
  byProject: TimesheetProjectRow[];
  byMonth: TimesheetMonthRow[];
};

export function buildTimesheetReport(rows: TimesheetInput[]): TimesheetReport {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const pctOf = (b: number, t: number) => (t > 0 ? Math.round((b / t) * 1000) / 10 : 0);

  type ProjAcc = { hours: number; billableHours: number; amount: number };
  const proj = new Map<string, { companyName: string; projectName: string; currency: string } & ProjAcc>();
  const month = new Map<string, { hours: number; billableHours: number }>();
  const cur = new Map<string, number>();

  let hours = 0;
  let billableHours = 0;
  let entryCount = 0;

  for (const r of rows) {
    const h = Number(r.hours) || 0;
    if (h <= 0) continue;
    entryCount += 1;
    const amt = r.billable && r.rate != null ? h * Number(r.rate) : 0;
    hours += h;
    if (r.billable) billableHours += h;

    const companyName = r.companyName ?? "—";
    const projectName = r.projectName ?? "—";
    const pKey = `${companyName} ${projectName} ${r.currency}`;
    const p = proj.get(pKey) ?? { companyName, projectName, currency: r.currency, hours: 0, billableHours: 0, amount: 0 };
    p.hours += h;
    if (r.billable) p.billableHours += h;
    p.amount += amt;
    proj.set(pKey, p);

    const mKey = r.workDate.slice(0, 7);
    const m = month.get(mKey) ?? { hours: 0, billableHours: 0 };
    m.hours += h;
    if (r.billable) m.billableHours += h;
    month.set(mKey, m);

    if (amt > 0) cur.set(r.currency, (cur.get(r.currency) ?? 0) + amt);
  }

  const nonBillableHours = hours - billableHours;
  return {
    hours: r1(hours),
    billableHours: r1(billableHours),
    nonBillableHours: r1(nonBillableHours),
    pct: pctOf(billableHours, hours),
    entryCount,
    amountByCurrency: [...cur.entries()]
      .map(([currency, amount]) => ({ currency, amount: r2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    byProject: [...proj.values()]
      .map((p) => ({
        companyName: p.companyName,
        projectName: p.projectName,
        currency: p.currency,
        hours: r1(p.hours),
        billableHours: r1(p.billableHours),
        amount: r2(p.amount),
      }))
      .sort((a, b) => b.hours - a.hours),
    byMonth: [...month.entries()]
      .map(([mo, v]) => ({ month: mo, hours: r1(v.hours), billableHours: r1(v.billableHours) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}
