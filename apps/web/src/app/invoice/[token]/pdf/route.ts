import { renderToBuffer } from "@react-pdf/renderer";
import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices, invoiceLineItems } from "@/db/schema";
import { InvoicePdf, invoicePdfDataFrom } from "@/lib/pdf/invoice-pdf";

// Public, no-login invoice PDF reached by its random token (DEV-76). Same token
// as the read-only view; not guarded by the proxy (matcher is /account/* only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response("Not found", { status: 404 });
  }

  const [inv] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      companyName: companies.name,
      paymentTermsDays: companies.paymentTermsDays,
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
      notes: invoices.notes,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      and(eq(invoices.publicToken, token), eq(invoices.type, "invoice"), isNull(invoices.deletedAt)),
    )
    .limit(1);
  if (!inv) return new Response("Not found", { status: 404 });

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

  const buffer = await renderToBuffer(InvoicePdf({ data: invoicePdfDataFrom(inv, lines) }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.invoiceNumber}.pdf"`,
    },
  });
}
