import { auth } from "@/lib/auth/server";
import { getAccess } from "@/lib/auth/rbac";
import {
  fetchTimesheetRows,
  parseTimesheetFilters,
} from "@/lib/timesheet-report-query";

// Timesheet detail as CSV with the page filters applied (DEV-74). Authenticated,
// owner-scoped.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = (v: string | number | boolean | null) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const access = await getAccess();
  if (access?.role !== "admin") return new Response("Forbidden", { status: 403 }); // DEV-141

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const filters = parseTimesheetFilters(sp);
  const rows = await fetchTimesheetRows(session.user.id, filters);

  const header = ["Date", "Client", "Project", "Task", "Hours", "Rate", "Billable", "Currency", "Amount"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const amount = r.billable && r.rate != null ? r.hours * r.rate : 0;
    lines.push(
      [
        r.workDate,
        r.companyName ?? "",
        r.projectName ?? "",
        r.task ?? "",
        r.hours,
        r.rate ?? "",
        r.billable ? "yes" : "no",
        r.currency,
        amount.toFixed(2),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  const csv = lines.join("\n") + "\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timesheet.csv"`,
    },
  });
}
