import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, invoices, invoiceLineItems, INVOICE_STATUSES } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { buildInvoiceDraft } from "@/lib/invoicing";
import { formatMoney } from "@/lib/money";

import { deleteInvoice, updateInvoiceStatus } from "./actions";
import { AddInvoiceForm, type InvoicePrefill } from "./add-invoice-form";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-brand/15 text-brand",
  viewed: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  overdue: "bg-destructive/15 text-destructive",
};

export default async function InvoicesPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const [companyRows, rows] = await Promise.all([
    db
      .select()
      .from(companies)
      .where(and(eq(companies.userId, session.user.id), isNull(companies.deletedAt)))
      .orderBy(asc(companies.name)),
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        client: invoices.client,
        companyName: companies.name,
        notes: invoices.notes,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        currency: invoices.currency,
        subtotal: invoices.subtotal,
        discountAmount: invoices.discountAmount,
        taxLabel: invoices.taxLabel,
        taxAmount: invoices.taxAmount,
        amount: invoices.amount,
        status: invoices.status,
        publicToken: invoices.publicToken,
        viewedAt: invoices.viewedAt,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(
        and(
          eq(invoices.userId, session.user.id),
          eq(invoices.type, "invoice"),
          isNull(invoices.deletedAt),
        ),
      )
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt)),
  ]);

  // Pre-compute the auto-fill suggestion (incl. line items) for each company so
  // selecting one in the form fills it in with no extra round-trip.
  const prefills: InvoicePrefill[] = await Promise.all(
    companyRows.map(async (c) => {
      const d = await buildInvoiceDraft(c, session.user.id);
      return {
        id: c.id,
        name: c.name,
        invoiceNumber: d.invoiceNumber,
        issueDate: d.issueDate,
        dueDate: d.dueDate,
        notes: d.notes,
        hours: d.hours,
        billingType: c.billingType,
        currency: c.currency,
        taxRate: c.taxRate,
        taxLabel: c.taxLabel,
        taxExempt: c.taxExempt,
        lineItems: d.lineItems.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
          sourceType: l.sourceType,
          sourceId: l.sourceId,
        })),
      };
    }),
  );

  // Line items for the listed invoices, grouped for display under each row.
  const allLines = await db
    .select({
      invoiceId: invoiceLineItems.invoiceId,
      description: invoiceLineItems.description,
      lineTotal: invoiceLineItems.lineTotal,
      sortOrder: invoiceLineItems.sortOrder,
    })
    .from(invoiceLineItems)
    .where(and(eq(invoiceLineItems.userId, session.user.id), isNull(invoiceLineItems.deletedAt)))
    .orderBy(asc(invoiceLineItems.sortOrder));
  const linesByInvoice = new Map<string, { description: string; lineTotal: string }[]>();
  for (const l of allLines) {
    const arr = linesByInvoice.get(l.invoiceId) ?? [];
    arr.push({ description: l.description, lineTotal: l.lineTotal });
    linesByInvoice.set(l.invoiceId, arr);
  }

  // Issued credit notes reduce an invoice's effective outstanding (DEV-121).
  const creditRows = await db
    .select({ creditedInvoiceId: invoices.creditedInvoiceId, amount: invoices.amount })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, session.user.id),
        eq(invoices.type, "credit_note"),
        eq(invoices.status, "issued"),
        isNull(invoices.deletedAt),
      ),
    );
  const creditByInvoice = new Map<string, number>();
  for (const c of creditRows) {
    if (!c.creditedInvoiceId) continue;
    creditByInvoice.set(c.creditedInvoiceId, (creditByInvoice.get(c.creditedInvoiceId) ?? 0) + Number(c.amount));
  }

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
          <AddInvoiceForm prefills={prefills} />
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
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.invoiceNumber}
                      <a
                        href={`/invoice/${r.publicToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand block text-xs font-normal hover:underline"
                      >
                        Public link ↗
                      </a>
                      <a
                        href={`/invoice/${r.publicToken}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand block text-xs font-normal hover:underline"
                      >
                        PDF ↓
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      {r.companyName ?? r.client ?? "—"}
                      {(linesByInvoice.get(r.id) ?? []).map((l, i) => (
                        <span key={i} className="text-muted-foreground block text-xs">
                          • {l.description} — {formatMoney(Number(l.lineTotal), r.currency)}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.issueDate}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.dueDate}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMoney(Number(r.amount), r.currency)}
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        {r.currency}
                      </span>
                      {Number(r.discountAmount ?? 0) > 0 || Number(r.taxAmount ?? 0) > 0 ? (
                        <span className="text-muted-foreground block text-xs font-normal">
                          {formatMoney(Number(r.subtotal ?? 0), r.currency)}
                          {Number(r.discountAmount ?? 0) > 0
                            ? ` − ${formatMoney(Number(r.discountAmount), r.currency)} disc`
                            : ""}
                          {Number(r.taxAmount ?? 0) > 0
                            ? ` + ${r.taxLabel ?? "tax"} ${formatMoney(Number(r.taxAmount), r.currency)}`
                            : ""}
                        </span>
                      ) : null}
                      {(creditByInvoice.get(r.id) ?? 0) > 0 ? (
                        <span className="block text-xs font-normal text-emerald-600 dark:text-emerald-400">
                          − {formatMoney(creditByInvoice.get(r.id) ?? 0, r.currency)} credited ·{" "}
                          {formatMoney(Number(r.amount) - (creditByInvoice.get(r.id) ?? 0), r.currency)}{" "}
                          outstanding
                        </span>
                      ) : null}
                    </td>
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
                      {r.viewedAt ? (
                        <span className="text-muted-foreground mt-1 block text-xs">
                          Viewed {new Date(r.viewedAt).toISOString().slice(0, 10)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-3">
                        {r.status === "draft" ? (
                          <Link
                            href={`/account/invoices/${r.id}/edit`}
                            className="text-muted-foreground hover:text-foreground text-xs"
                          >
                            Edit
                          </Link>
                        ) : null}
                        <form action={deleteInvoice}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-muted-foreground hover:text-destructive text-xs">
                            Delete
                          </button>
                        </form>
                      </div>
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
