import { redirect } from "next/navigation";
import { and, eq, isNull, ne, sql } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, invoices, payments } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { formatMoney } from "@/lib/money";
import { buildAgingReport, AGING_BUCKETS, AGING_LABELS, type AgingInput } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  const uid = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  // Issued, unpaid invoices (exclude draft + paid) with company + currency.
  const invRows = await db
    .select({
      id: invoices.id,
      companyId: invoices.companyId,
      companyName: companies.name,
      currency: invoices.currency,
      amount: invoices.amount,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      and(
        eq(invoices.userId, uid),
        eq(invoices.type, "invoice"),
        ne(invoices.status, "draft"),
        ne(invoices.status, "paid"),
        isNull(invoices.deletedAt),
      ),
    );

  const payAgg = await db
    .select({ invoiceId: payments.invoiceId, paid: sql<string>`sum(${payments.amount})` })
    .from(payments)
    .where(and(eq(payments.userId, uid), isNull(payments.deletedAt)))
    .groupBy(payments.invoiceId);
  const paidBy = new Map(payAgg.map((r) => [r.invoiceId, Number(r.paid)]));

  const creditAgg = await db
    .select({ creditedInvoiceId: invoices.creditedInvoiceId, credited: sql<string>`sum(${invoices.amount})` })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, uid),
        eq(invoices.type, "credit_note"),
        eq(invoices.status, "issued"),
        isNull(invoices.deletedAt),
      ),
    )
    .groupBy(invoices.creditedInvoiceId);
  const creditBy = new Map(creditAgg.map((r) => [r.creditedInvoiceId, Number(r.credited)]));

  const rows: AgingInput[] = invRows.map((i) => ({
    companyId: i.companyId,
    companyName: i.companyName,
    currency: i.currency,
    outstanding:
      Math.round((Number(i.amount) - (paidBy.get(i.id) ?? 0) - (creditBy.get(i.id) ?? 0)) * 100) / 100,
    dueDate: i.dueDate,
  }));
  const groups = buildAgingReport(rows, today);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts receivable</h1>
        <p className="text-muted-foreground text-sm">
          Outstanding balances by client and age, as of {today}.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing outstanding — all invoices are paid. 🎉</p>
      ) : (
        groups.map((g) => {
          const overdue = g.total - g.totals.current;
          return (
            <div key={g.currency} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-muted-foreground text-xs font-medium">
                      Outstanding ({g.currency})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-xl font-semibold">
                    {formatMoney(g.total, g.currency)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-muted-foreground text-xs font-medium">Overdue</CardTitle>
                  </CardHeader>
                  <CardContent className="text-destructive font-mono text-xl font-semibold">
                    {formatMoney(overdue, g.currency)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-muted-foreground text-xs font-medium">Current</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-xl font-semibold">
                    {formatMoney(g.totals.current, g.currency)}
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-muted-foreground text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Client</th>
                      {AGING_BUCKETS.map((b) => (
                        <th key={b} className="px-4 py-2 text-right font-medium">
                          {AGING_LABELS[b]}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.clients.map((c) => (
                      <tr key={c.companyId ?? c.companyName} className="border-t">
                        <td className="px-4 py-2">{c.companyName}</td>
                        {AGING_BUCKETS.map((b) => (
                          <td key={b} className="px-4 py-2 text-right font-mono">
                            {c.buckets[b] ? formatMoney(c.buckets[b], g.currency) : "—"}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right font-mono font-medium">
                          {formatMoney(c.total, g.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-medium">
                      <td className="px-4 py-2">Total</td>
                      {AGING_BUCKETS.map((b) => (
                        <td key={b} className="px-4 py-2 text-right font-mono">
                          {formatMoney(g.totals[b], g.currency)}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-mono">{formatMoney(g.total, g.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
