import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { auth } from "@/lib/auth/server";

import { deleteTimeEntry } from "./actions";
import { AddTimeEntryForm } from "./add-time-entry-form";

export const dynamic = "force-dynamic";

export default async function TimesheetsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const rows = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, session.user.id), isNull(timeEntries.deletedAt)))
    .orderBy(desc(timeEntries.workDate), desc(timeEntries.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
        <p className="text-muted-foreground text-sm">Log time against clients and projects.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log time</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTimeEntryForm />
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
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Hours</th>
                  <th className="px-4 py-2 font-medium">Notes</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.workDate}</td>
                    <td className="px-4 py-2">{r.client}</td>
                    <td className="px-4 py-2 font-mono">{r.hours}</td>
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
