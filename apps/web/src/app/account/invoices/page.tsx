import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { invoices, INVOICE_STATUSES } from "@/db/schema";
import { auth } from "@/lib/auth/server";

import { deleteInvoice, updateInvoiceStatus } from "./actions";
import { AddInvoiceForm } from "./add-invoice-form";

export const dynamic = "force-dynamic";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const statusBadge: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-brand/15 text-brand",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  overdue: "bg-destructive/15 text-destructive",
};

export default async function InvoicesPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.userId, session.user.id), isNull(invoices.deletedAt)))
    .orderBy(desc(invoices.issueDate), desc(invoices.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm">Create and track client invoices.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <AddInvoiceForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">All invoices</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No invoices yet — create your first above.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Invoice #</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Issued</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.invoiceNumber}</td>
                    <td className="px-4 py-2">{r.client}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.issueDate}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.dueDate}</td>
                    <td className="px-4 py-2 text-right font-mono">{usd.format(Number(r.amount))}</td>
                    <td className="px-4 py-2">
                      <form action={updateInvoiceStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[r.status] ?? ""}`}
                        >
                          {r.status}
                        </span>
                        <select
                          name="status"
                          defaultValue={r.status}
                          className="border-input bg-background rounded-md border px-1.5 py-1 text-xs"
                        >
                          {INVOICE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button className="text-muted-foreground hover:text-foreground text-xs">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteInvoice}>
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
