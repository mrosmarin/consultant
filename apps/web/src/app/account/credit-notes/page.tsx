import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, invoices, CREDIT_NOTE_STATUSES } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { formatMoney } from "@/lib/money";

import { deleteCreditNote, updateCreditNoteStatus } from "./actions";
import { AddCreditNoteForm, type CreditableInvoice } from "./add-credit-note-form";

export const dynamic = "force-dynamic";

export default async function CreditNotesPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const docs = await db
    .select({
      id: invoices.id,
      type: invoices.type,
      invoiceNumber: invoices.invoiceNumber,
      companyName: companies.name,
      companyCurrency: companies.currency,
      companyTaxRate: companies.taxRate,
      companyTaxLabel: companies.taxLabel,
      companyTaxExempt: companies.taxExempt,
      issueDate: invoices.issueDate,
      currency: invoices.currency,
      amount: invoices.amount,
      status: invoices.status,
      creditedInvoiceId: invoices.creditedInvoiceId,
      notes: invoices.notes,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      and(
        eq(invoices.userId, session.user.id),
        isNull(invoices.deletedAt),
      ),
    )
    .orderBy(desc(invoices.issueDate), desc(invoices.createdAt));

  const creditableInvoices: CreditableInvoice[] = docs
    .filter((d) => d.type === "invoice")
    .map((d) => ({
      id: d.id,
      label: `${d.invoiceNumber} · ${d.companyName ?? "—"} · ${formatMoney(Number(d.amount), d.currency)}`,
      currency: d.currency,
      taxRate: d.companyTaxRate,
      taxLabel: d.companyTaxLabel,
      taxExempt: d.companyTaxExempt ?? false,
    }));
  const invoiceNumberById = new Map(docs.map((d) => [d.id, d.invoiceNumber]));
  const creditNotes = docs.filter((d) => d.type === "credit_note");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Credit notes</h1>
        <p className="text-muted-foreground text-sm">
          Issue a credit against an invoice; it reduces that invoice&apos;s outstanding balance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New credit note</CardTitle>
        </CardHeader>
        <CardContent>
          <AddCreditNoteForm invoices={creditableInvoices} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">All credit notes</h2>
        {creditNotes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No credit notes yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Credit #</th>
                  <th className="px-4 py-2 font-medium">Against</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Issued</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{c.invoiceNumber}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {c.creditedInvoiceId ? (invoiceNumberById.get(c.creditedInvoiceId) ?? "—") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {c.companyName ?? "—"}
                      {c.notes ? <span className="text-muted-foreground block text-xs">{c.notes}</span> : null}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{c.issueDate}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      −{formatMoney(Number(c.amount), c.currency)}
                    </td>
                    <td className="px-4 py-2">
                      <form action={updateCreditNoteStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <select name="status" defaultValue={c.status} className="border-input bg-background rounded-md border px-1.5 py-1 text-xs">
                          {CREDIT_NOTE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button className="text-muted-foreground hover:text-foreground text-xs">Save</button>
                      </form>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteCreditNote}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="text-muted-foreground hover:text-destructive text-xs">Delete</button>
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
