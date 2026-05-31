import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { companies, projects } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { formatMoney } from "@/lib/money";
import { buildTimesheetReport } from "@/lib/reports";
import {
  fetchTimesheetRows,
  parseTimesheetFilters,
  timesheetFilterQuery,
} from "@/lib/timesheet-report-query";

export const dynamic = "force-dynamic";

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";
const inputClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export default async function TimesheetReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  const uid = session.user.id;

  const sp = await searchParams;
  const filters = parseTimesheetFilters(sp);

  const [companyRows, projectRows, entries] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(and(eq(companies.userId, uid), isNull(companies.deletedAt)))
      .orderBy(asc(companies.name)),
    db
      .select({ id: projects.id, name: projects.name, companyId: projects.companyId })
      .from(projects)
      .where(and(eq(projects.userId, uid), isNull(projects.deletedAt)))
      .orderBy(asc(projects.name)),
    fetchTimesheetRows(uid, filters),
  ]);
  const companyName = new Map(companyRows.map((c) => [c.id, c.name]));
  const report = buildTimesheetReport(entries);
  const qs = timesheetFilterQuery(filters);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheet report</h1>
          <p className="text-muted-foreground text-sm">
            Logged time by project and period, with a client-ready detail view.{" "}
            <Link href="/account/reports" className="text-brand underline">
              Back to reports
            </Link>
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a
            href={`/account/reports/timesheets/export${qs}`}
            className="border-input hover:bg-secondary rounded-md border px-3 py-2"
          >
            Download CSV ↓
          </a>
          <a
            href={`/account/reports/timesheets/pdf${qs}`}
            target="_blank"
            rel="noreferrer"
            className="border-input hover:bg-secondary rounded-md border px-3 py-2"
          >
            Download PDF ↓
          </a>
        </div>
      </div>

      {/* No-JS GET filter form — submits the same page with new query params. */}
      <form method="get" className="grid items-end gap-3 sm:grid-cols-5">
        <div className="grid gap-2">
          <Label htmlFor="from">From</Label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className={inputClass} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="to">To</Label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className={inputClass} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company">Client</Label>
          <select id="company" name="company" defaultValue={filters.companyId ?? ""} className={selectClass}>
            <option value="">All clients</option>
            {companyRows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project">Project</Label>
          <select id="project" name="project" defaultValue={filters.projectId ?? ""} className={selectClass}>
            <option value="">All projects</option>
            {projectRows.map((p) => (
              <option key={p.id} value={p.id}>
                {companyName.get(p.companyId) ? `${companyName.get(p.companyId)} · ` : ""}
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-brand text-brand-foreground hover:bg-brand/90 h-9 rounded-md px-4 text-sm font-medium"
          >
            Apply
          </button>
          <Link
            href="/account/reports/timesheets"
            className="border-input hover:bg-secondary flex h-9 items-center rounded-md border px-4 text-sm"
          >
            Clear
          </Link>
        </div>
      </form>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Total hours</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-semibold">{report.hours}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Billable hours</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-semibold">{report.billableHours}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Utilization</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-semibold">{report.pct}%</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Billable value</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-semibold">
            {report.amountByCurrency.length === 0
              ? "—"
              : report.amountByCurrency.map((c) => formatMoney(c.amount, c.currency)).join(" · ")}
          </CardContent>
        </Card>
      </div>

      {report.entryCount === 0 ? (
        <p className="text-muted-foreground text-sm">
          No time logged for the selected filters.
        </p>
      ) : (
        <>
          {/* By project */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">By project</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Client · Project</th>
                    <th className="px-4 py-2 text-right font-medium">Hours</th>
                    <th className="px-4 py-2 text-right font-medium">Billable hrs</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byProject.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">
                        {p.companyName} · {p.projectName}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{p.hours}</td>
                      <td className="px-4 py-2 text-right font-mono">{p.billableHours}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {p.amount > 0 ? formatMoney(p.amount, p.currency) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* By month */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">By month</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Month</th>
                    <th className="px-4 py-2 text-right font-medium">Hours</th>
                    <th className="px-4 py-2 text-right font-medium">Billable hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byMonth.map((m) => (
                    <tr key={m.month} className="border-t">
                      <td className="px-4 py-2">{monthLabel(m.month)}</td>
                      <td className="px-4 py-2 text-right font-mono">{m.hours}</td>
                      <td className="px-4 py-2 text-right font-mono">{m.billableHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Client-ready detail */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Detail</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Client · Project</th>
                    <th className="px-4 py-2 font-medium">Task</th>
                    <th className="px-4 py-2 text-right font-medium">Hours</th>
                    <th className="px-4 py-2 text-center font-medium">Billable</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-mono">{e.workDate}</td>
                      <td className="px-4 py-2">
                        {(e.companyName ?? "—") + (e.projectName ? ` · ${e.projectName}` : "")}
                      </td>
                      <td className="px-4 py-2">{e.task ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-mono">{e.hours}</td>
                      <td className="px-4 py-2 text-center">{e.billable ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
