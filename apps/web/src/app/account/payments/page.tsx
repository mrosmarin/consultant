import { redirect } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, invoices, payments } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { formatMoney } from "@/lib/money";

import { deletePayment } from "./actions";
import { AddPaymentForm, type PayableInvoice } from "./add-payment-form";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  check: "Check",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

export default async function PaymentsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  const uid = session.user.id;

  // Real invoices with their company currency.
  const invRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      companyName: companies.name,
      currency: invoices.currency,
      amount: invoices.amount,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(and(eq(invoices.userId, uid), eq(invoices.type, "invoice"), isNull(invoices.deletedAt)));

  // Sum payments per invoice, and issued credit notes per invoice.
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

  const payable: PayableInvoice[] = invRows
    .map((i) => ({
      id: i.id,
      currency: i.currency,
      outstanding:
        Math.round((Number(i.amount) - (paidBy.get(i.id) ?? 0) - (creditBy.get(i.id) ?? 0)) * 100) / 100,
      label: `${i.invoiceNumber} · ${i.companyName ?? "—"} · ${formatMoney(Number(i.amount), i.currency)}`,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  // Payment ledger for display.
  const rows = await db
    .select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      currency: invoices.currency,
      amount: payments.amount,
      method: payments.method,
      reference: payments.reference,
      receivedDate: payments.receivedDate,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(and(eq(payments.userId, uid), isNull(payments.deletedAt)))
    .orderBy(desc(payments.receivedDate), desc(payments.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm">
          Record what clients pay (check, bank transfer, cash…); invoices reconcile automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record payment</CardTitle>
        </CardHeader>
        <CardContent>
          <AddPaymentForm invoices={payable} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">Payment history</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Received</th>
                  <th className="px-4 py-2 font-medium">Invoice</th>
                  <th className="px-4 py-2 font-medium">Method</th>
                  <th className="px-4 py-2 font-medium">Reference</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.receivedDate}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.invoiceNumber ?? "—"}</td>
                    <td className="px-4 py-2">{METHOD_LABEL[r.method] ?? r.method}</td>
                    <td className="text-muted-foreground px-4 py-2">{r.reference ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMoney(Number(r.amount), r.currency)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={deletePayment}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="invoiceId" value={r.invoiceId} />
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
