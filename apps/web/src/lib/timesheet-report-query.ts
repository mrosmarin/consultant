import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { companies, projects, timeEntries } from "@/db/schema";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { type TimesheetInput } from "@/lib/reports";

// Shared filtering + fetching for the timesheet report (DEV-74). The on-screen
// report, the CSV export, and the branded PDF all run the SAME filters through
// here so the three views can never disagree. Owner-scoped; soft-deletes excluded.

export type TimesheetFilters = {
  from?: string; // ISO yyyy-mm-dd (inclusive)
  to?: string; // ISO yyyy-mm-dd (inclusive)
  companyId?: string;
  projectId?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

// Parse untrusted query params into validated filters (drops anything malformed).
export function parseTimesheetFilters(
  sp: Record<string, string | string[] | undefined>,
): TimesheetFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const from = one(sp.from);
  const to = one(sp.to);
  const companyId = one(sp.company);
  const projectId = one(sp.project);
  return {
    from: from && ISO_DATE.test(from) ? from : undefined,
    to: to && ISO_DATE.test(to) ? to : undefined,
    companyId: companyId && UUID.test(companyId) ? companyId : undefined,
    projectId: projectId && UUID.test(projectId) ? projectId : undefined,
  };
}

// Rebuild the query string for export links so CSV/PDF inherit the page filters.
export function timesheetFilterQuery(f: TimesheetFilters): string {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.companyId) p.set("company", f.companyId);
  if (f.projectId) p.set("project", f.projectId);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Fetch the filtered, owner-scoped time entries as report rows, ordered by date
// (ascending) so the detail/CSV/PDF read chronologically.
export async function fetchTimesheetRows(
  uid: string,
  f: TimesheetFilters,
): Promise<TimesheetInput[]> {
  const conds = [eq(timeEntries.userId, uid), isNull(timeEntries.deletedAt)];
  if (f.from) conds.push(gte(timeEntries.workDate, f.from));
  if (f.to) conds.push(lte(timeEntries.workDate, f.to));
  if (f.companyId) conds.push(eq(timeEntries.companyId, f.companyId));
  if (f.projectId) conds.push(eq(timeEntries.projectId, f.projectId));

  const rows = await db
    .select({
      workDate: timeEntries.workDate,
      companyName: companies.name,
      legacyClient: timeEntries.client,
      projectName: projects.name,
      task: timeEntries.task,
      hours: timeEntries.hours,
      rate: timeEntries.rate,
      billable: timeEntries.billable,
      currency: companies.currency,
    })
    .from(timeEntries)
    .leftJoin(companies, eq(timeEntries.companyId, companies.id))
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(and(...conds))
    .orderBy(asc(timeEntries.workDate));

  return rows.map(
    (r): TimesheetInput => ({
      workDate: r.workDate,
      companyName: r.companyName ?? r.legacyClient ?? null,
      projectName: r.projectName ?? null,
      task: r.task,
      hours: Number(r.hours),
      rate: r.rate == null ? null : Number(r.rate),
      billable: r.billable,
      currency: r.currency ?? DEFAULT_CURRENCY,
    }),
  );
}
