import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, invoices } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { getAccess } from "@/lib/auth/rbac";

// Per-invoice tax detail as CSV for the accountant (DEV-135). Authenticated,
// owner-scoped. Issued invoices with tax > 0.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = (v: string | number | null) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const access = await getAccess();
  if (access?.role !== "admin") return new Response("Forbidden", { status: 403 }); // DEV-141

  const rows = await db
    .select({
      issueDate: invoices.issueDate,
      invoiceNumber: invoices.invoiceNumber,
      client: companies.name,
      currency: invoices.currency,
      subtotal: invoices.subtotal,
      discountAmount: invoices.discountAmount,
      taxLabel: invoices.taxLabel,
      taxRate: invoices.taxRate,
      taxAmount: invoices.taxAmount,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      and(
        eq(invoices.userId, session.user.id),
        eq(invoices.type, "invoice"),
        ne(invoices.status, "draft"),
        isNull(invoices.deletedAt),
        sql`coalesce(${invoices.taxAmount}, 0) > 0`,
      ),
    )
    .orderBy(asc(invoices.issueDate));

  const header = ["Date", "Invoice", "Client", "Currency", "Taxable", "Tax label", "Tax rate %", "Tax"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const taxable = Number(r.subtotal ?? 0) - Number(r.discountAmount ?? 0);
    lines.push(
      [
        r.issueDate,
        r.invoiceNumber,
        r.client ?? "",
        r.currency,
        taxable.toFixed(2),
        r.taxLabel ?? "Tax",
        Number(r.taxRate ?? 0),
        Number(r.taxAmount ?? 0).toFixed(2),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  const csv = lines.join("\n") + "\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tax-summary.csv"`,
    },
  });
}
