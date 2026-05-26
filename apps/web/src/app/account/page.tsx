import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { and, eq, gte, isNull, ne, sql } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { invoices, timeEntries } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

function weekStartISO() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const sinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sinceMonday),
  );
  return monday.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  const name = session.user.name || session.user.email || "there";

  const [agg] = await db
    .select({ total: sql<string>`coalesce(sum(${timeEntries.hours}), 0)` })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, session.user.id),
        isNull(timeEntries.deletedAt),
        gte(timeEntries.workDate, weekStartISO()),
      ),
    );
  const hoursThisWeek = Number(agg?.total ?? 0);

  const [invAgg] = await db
    .select({ open: sql<string>`count(*)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, session.user.id),
        isNull(invoices.deletedAt),
        ne(invoices.status, "paid"),
      ),
    );
  const openInvoices = Number(invAgg?.open ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {name}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Hours this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-semibold">{hoursThisWeek}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Open invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-semibold">{openInvoices}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/account/timesheets">
            <Plus className="size-4" /> Log time
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/invoices">
            <Plus className="size-4" /> New invoice
          </Link>
        </Button>
      </div>
    </div>
  );
}
