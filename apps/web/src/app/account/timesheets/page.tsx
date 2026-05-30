import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, projects, timeEntries } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { listCompanyOptions } from "@/lib/companies";
import { listProjectOptions } from "@/lib/projects";

import { deleteTimeEntry } from "./actions";
import { AddTimeEntryForm } from "./add-time-entry-form";

export const dynamic = "force-dynamic";

// "HH:MM:SS" → "HH:MM"
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export default async function TimesheetsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const [companyOptions, projectOptions, rows] = await Promise.all([
    listCompanyOptions(session.user.id),
    listProjectOptions(session.user.id),
    db
      .select({
        id: timeEntries.id,
        workDate: timeEntries.workDate,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        hours: timeEntries.hours,
        rate: timeEntries.rate,
        billable: timeEntries.billable,
        notes: timeEntries.notes,
        client: timeEntries.client,
        companyName: companies.name,
        projectName: projects.name,
      })
      .from(timeEntries)
      .leftJoin(companies, eq(timeEntries.companyId, companies.id))
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(eq(timeEntries.userId, session.user.id), isNull(timeEntries.deletedAt)))
      .orderBy(desc(timeEntries.workDate), desc(timeEntries.createdAt)),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
        <p className="text-muted-foreground text-sm">Log time against the companies you bill.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log time</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTimeEntryForm companies={companyOptions} projects={projectOptions} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">Recent entries</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No entries yet — log your first above.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Project</th>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Hours</th>
                  <th className="px-4 py-2 font-medium">Rate</th>
                  <th className="px-4 py-2 font-medium">Notes</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.workDate}</td>
                    <td className="px-4 py-2">{r.companyName ?? r.client ?? "—"}</td>
                    <td className="text-muted-foreground px-4 py-2">{r.projectName ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.startTime && r.endTime
                        ? `${hhmm(r.startTime)}–${hhmm(r.endTime)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {r.hours}
                      {!r.billable ? (
                        <span className="text-muted-foreground ml-1 font-sans text-xs">
                          (non-billable)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.billable && r.rate ? `$${Number(r.rate).toFixed(2)}` : "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">{r.notes}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteTimeEntry}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-muted-foreground hover:text-destructive text-xs">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
