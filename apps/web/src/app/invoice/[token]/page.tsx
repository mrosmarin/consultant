import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, invoiceLineItems } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { getBusinessSettings, issuerInfo } from "@/lib/business-settings";

// Public, no-login invoice view reached by its random token (DEV-122). Opening it
// records the first view: stamps viewed_at and promotes a "sent" invoice to
// "viewed". Not guarded by the portal proxy (matcher is /account/* only).
export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // UUID-shaped tokens only; bail early on anything else.
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const [inv] = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      invoiceNumber: invoices.invoiceNumber,
      companyName: companies.name,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      subtotal: invoices.subtotal,
      discountAmount: invoices.discountAmount,
      discountType: invoices.discountType,
      discountValue: invoices.discountValue,
      taxLabel: invoices.taxLabel,
      taxRate: invoices.taxRate,
      taxAmount: invoices.taxAmount,
      amount: invoices.amount,
      status: invoices.status,
      notes: invoices.notes,
      viewedAt: invoices.viewedAt,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      and(eq(invoices.publicToken, token), eq(invoices.type, "invoice"), isNull(invoices.deletedAt)),
    )
    .limit(1);
  if (!inv) notFound();

  // Record the open: first view stamps viewed_at; a "sent" invoice becomes "viewed".
  if (inv.viewedAt === null || inv.status === "sent") {
    await db
      .update(invoices)
      .set({
        viewedAt: inv.viewedAt ?? new Date(),
        status: inv.status === "sent" ? "viewed" : inv.status,
      })
      .where(eq(invoices.id, inv.id));
  }

  const lines = await db
    .select({
      description: invoiceLineItems.description,
      quantity: invoiceLineItems.quantity,
      unitAmount: invoiceLineItems.unitAmount,
      lineTotal: invoiceLineItems.lineTotal,
    })
    .from(invoiceLineItems)
    .where(and(eq(invoiceLineItems.invoiceId, inv.id), isNull(invoiceLineItems.deletedAt)))
    .orderBy(asc(invoiceLineItems.sortOrder));

  const issuer = issuerInfo(await getBusinessSettings(inv.userId));
  const fmt = (n: number | string) => formatMoney(Number(n), inv.currency);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="bg-card rounded-xl border p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Invoice</p>
            <h1 className="font-mono text-xl font-semibold">{inv.invoiceNumber}</h1>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Issued {inv.issueDate}</p>
            <p className="text-muted-foreground">Due {inv.dueDate}</p>
            <a href={`/invoice/${token}/pdf`} className="text-brand text-xs hover:underline">
              Download PDF ↓
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">From</p>
            <p className="font-medium">{issuer.legalName}</p>
            {issuer.addressLines.map((line, i) => (
              <p key={i} className="text-muted-foreground">
                {line}
              </p>
            ))}
            {issuer.taxId ? <p className="text-muted-foreground">Tax ID: {issuer.taxId}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Billed to</p>
            <p className="font-medium">{inv.companyName ?? "—"}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="w-16 px-3 py-2 text-right font-medium">Qty</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Unit</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{l.description}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(l.quantity)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(l.unitAmount)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={3} className="px-3 py-2 text-right text-sm">Subtotal</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(inv.subtotal ?? inv.amount)}</td>
              </tr>
              {Number(inv.discountAmount ?? 0) > 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-sm">
                    Discount{inv.discountType === "percent" ? ` (${Number(inv.discountValue)}%)` : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">−{fmt(inv.discountAmount!)}</td>
                </tr>
              ) : null}
              {Number(inv.taxAmount ?? 0) > 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-sm">
                    {inv.taxLabel ?? "Tax"} ({Number(inv.taxRate)}%)
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(inv.taxAmount!)}</td>
                </tr>
              ) : null}
              <tr className="border-t">
                <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium">Total due</td>
                <td className="px-3 py-2 text-right font-mono text-base font-semibold">{fmt(inv.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {inv.notes ? <p className="text-muted-foreground mt-4 text-sm">{inv.notes}</p> : null}

        <div className="mt-6 border-t pt-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Payment</p>
          {issuer.paymentLines.length ? (
            issuer.paymentLines.map((line, i) => (
              <p key={i} className="text-muted-foreground mt-1 text-sm">
                {line}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">Contact us for payment details.</p>
          )}
        </div>

        <p className="text-muted-foreground mt-6 text-xs">{issuer.legalName}</p>
      </div>
    </main>
  );
}
