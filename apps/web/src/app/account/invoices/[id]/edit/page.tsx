import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, invoices, invoiceLineItems } from "@/db/schema";
import { auth } from "@/lib/auth/server";

import { EditInvoiceForm } from "../../edit-invoice-form";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.userId, session.user.id),
        eq(invoices.type, "invoice"),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);
  if (!invoice) notFound();

  // Tax config (for the live preview) follows the company; fall back to the
  // invoice's snapshot if the company is gone.
  const [company] = invoice.companyId
    ? await db
        .select({ taxRate: companies.taxRate, taxLabel: companies.taxLabel, taxExempt: companies.taxExempt })
        .from(companies)
        .where(and(eq(companies.id, invoice.companyId), eq(companies.userId, session.user.id)))
        .limit(1)
    : [];

  const lines = await db
    .select({
      description: invoiceLineItems.description,
      quantity: invoiceLineItems.quantity,
      unitAmount: invoiceLineItems.unitAmount,
      sourceType: invoiceLineItems.sourceType,
      sourceId: invoiceLineItems.sourceId,
    })
    .from(invoiceLineItems)
    .where(
      and(
        eq(invoiceLineItems.invoiceId, id),
        eq(invoiceLineItems.userId, session.user.id),
        isNull(invoiceLineItems.deletedAt),
      ),
    )
    .orderBy(asc(invoiceLineItems.sortOrder));

  const locked = invoice.status !== "draft";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/invoices" className="text-muted-foreground hover:text-foreground text-sm">
          ← Back to invoices
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit invoice <span className="font-mono">{invoice.invoiceNumber}</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Adjust line items, order, discount and dates. Tax follows the client; amounts recompute on save.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          {locked ? (
            <p className="text-muted-foreground text-sm">
              This invoice is <span className="font-medium">{invoice.status}</span> and can&apos;t be
              edited. Set it back to <span className="font-medium">draft</span> on the invoices list
              first.
            </p>
          ) : (
            <EditInvoiceForm
              invoice={{
                id: invoice.id,
                currency: invoice.currency,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                notes: invoice.notes ?? "",
                discountType: invoice.discountType ?? "none",
                discountValue: invoice.discountValue ?? "",
                taxRate: invoice.taxRate,
                taxLabel: invoice.taxLabel,
                taxExempt: company?.taxExempt ?? false,
                lines: lines.map((l) => ({
                  description: l.description,
                  quantity: l.quantity,
                  unitAmount: l.unitAmount,
                  sourceType: l.sourceType,
                  sourceId: l.sourceId,
                })),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
