import { redirect } from "next/navigation";

import { getClientContext, getClientInvoices } from "@/lib/client-data";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  sent: "bg-brand/15 text-brand",
  viewed: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  partial: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  overdue: "bg-destructive/15 text-destructive",
};

export default async function ClientInvoicesPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/auth/sign-in?reason=auth");
  if (!ctx.company) return null;

  const invoices = await getClientInvoices(ctx.company.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm">Your issued invoices from EndlessWorlds, LLC.</p>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted-foreground text-sm">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                <th className="px-4 py-2 text-right font-medium">Document</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{i.invoiceNumber}</td>
                  <td className="px-4 py-2">{i.issueDate}</td>
                  <td className="px-4 py-2">{i.dueDate ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[i.status] ?? "bg-secondary"}`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(i.amount, i.currency)}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {i.outstanding > 0 ? formatMoney(i.outstanding, i.currency) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {i.publicToken ? (
                      <span className="flex justify-end gap-3">
                        <a
                          href={`/invoice/${i.publicToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand hover:underline"
                        >
                          View
                        </a>
                        <a
                          href={`/invoice/${i.publicToken}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand hover:underline"
                        >
                          PDF
                        </a>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
