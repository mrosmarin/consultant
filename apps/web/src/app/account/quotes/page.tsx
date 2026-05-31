import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, invoices, invoiceLineItems, QUOTE_STATUSES } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { formatMoney } from "@/lib/money";

import { convertQuoteToInvoice, deleteQuote, updateQuoteStatus } from "./actions";
import { AddQuoteForm, type QuoteCompany } from "./add-quote-form";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-brand/15 text-brand",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  declined: "bg-destructive/15 text-destructive",
  expired: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export default async function QuotesPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  await requireAdmin(); // admin-only section -- team members get /forbidden (DEV-141)

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
        companyName: companies.name,
        validUntil: invoices.validUntil,
        issueDate: invoices.issueDate,
        currency: invoices.currency,
        amount: invoices.amount,
        status: invoices.status,
        sourceQuoteId: invoices.sourceQuoteId,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(
        and(
          eq(invoices.userId, session.user.id),
          eq(invoices.type, "quote"),
          isNull(invoices.deletedAt),
        ),
      )
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt)),
  ]);

  // Which quotes have already been converted to an invoice (to disable re-convert).
  const converted = await db
    .select({ sourceQuoteId: invoices.sourceQuoteId })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, session.user.id),
        eq(invoices.type, "invoice"),
        isNull(invoices.deletedAt),
      ),
    );
  const convertedSet = new Set(converted.map((c) => c.sourceQuoteId).filter(Boolean));

  const lineRows = await db
    .select({
      invoiceId: invoiceLineItems.invoiceId,
      description: invoiceLineItems.description,
      lineTotal: invoiceLineItems.lineTotal,
    })
    .from(invoiceLineItems)
    .where(and(eq(invoiceLineItems.userId, session.user.id), isNull(invoiceLineItems.deletedAt)))
    .orderBy(asc(invoiceLineItems.sortOrder));
  const linesByQuote = new Map<string, { description: string; lineTotal: string }[]>();
  for (const l of lineRows) {
    const arr = linesByQuote.get(l.invoiceId) ?? [];
    arr.push({ description: l.description, lineTotal: l.lineTotal });
    linesByQuote.set(l.invoiceId, arr);
  }

  const companyOptions: QuoteCompany[] = companyRows.map((c) => ({
    id: c.id,
    name: c.name,
    currency: c.currency,
    taxRate: c.taxRate,
    taxLabel: c.taxLabel,
    taxExempt: c.taxExempt,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
        <p className="text-muted-foreground text-sm">
          Draft estimates for clients; accept one to convert it into an invoice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New quote</CardTitle>
        </CardHeader>
        <CardContent>
          <AddQuoteForm companies={companyOptions} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">All quotes</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No quotes yet — create your first above.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Quote #</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Issued</th>
                  <th className="px-4 py-2 font-medium">Valid until</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isConverted = convertedSet.has(r.id);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{r.invoiceNumber}</td>
                      <td className="px-4 py-2">
                        {r.companyName ?? "—"}
                        {(linesByQuote.get(r.id) ?? []).map((l, i) => (
                          <span key={i} className="text-muted-foreground block text-xs">
                            • {l.description} — {formatMoney(Number(l.lineTotal), r.currency)}
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{r.issueDate}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.validUntil ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatMoney(Number(r.amount), r.currency)}
                      </td>
                      <td className="px-4 py-2">
                        <form action={updateQuoteStatus} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={r.id} />
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[r.status] ?? ""}`}>
                            {r.status}
                          </span>
                          <select name="status" defaultValue={r.status} className="border-input bg-background rounded-md border px-1.5 py-1 text-xs">
                            {QUOTE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button className="text-muted-foreground hover:text-foreground text-xs">Save</button>
                        </form>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-3">
                          {isConverted ? (
                            <Link href="/account/invoices" className="text-muted-foreground hover:text-foreground text-xs">
                              Invoiced ↗
                            </Link>
                          ) : (
                            <form action={convertQuoteToInvoice}>
                              <input type="hidden" name="id" value={r.id} />
                              <button className="text-brand hover:underline text-xs">Convert to invoice</button>
                            </form>
                          )}
                          <form action={deleteQuote}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="text-muted-foreground hover:text-destructive text-xs">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
