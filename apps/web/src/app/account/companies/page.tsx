import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { formatMoney } from "@/lib/money";

import { deleteCompany } from "./actions";
import { CompanyForm } from "./company-form";
import { GenerateInvoiceButton } from "./generate-invoice-button";

export const dynamic = "force-dynamic";

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  semimonthly: "Semi-monthly",
  monthly: "Monthly",
};

function billingSummary(
  billingType: string,
  hourlyRate: string | null,
  retainer: string | null,
  currency: string,
) {
  if (billingType === "hourly") {
    return hourlyRate ? `${formatMoney(Number(hourlyRate), currency)}/hr` : "Hourly";
  }
  return retainer ? `${formatMoney(Number(retainer), currency)}/period` : "Retainer";
}

export default async function CompaniesPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const rows = await db
    .select()
    .from(companies)
    .where(and(eq(companies.userId, session.user.id), isNull(companies.deletedAt)))
    .orderBy(asc(companies.name));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="text-muted-foreground text-sm">
          Onboard the clients you bill — timesheets and invoices are logged against them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboard a company</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">Your companies</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No companies yet — onboard your first above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Contact</th>
                  <th className="px-4 py-2 font-medium">Billing</th>
                  <th className="px-4 py-2 font-medium">Frequency</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="text-muted-foreground px-4 py-2">
                      {r.contactName || r.contactEmail || "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {billingSummary(r.billingType, r.hourlyRate, r.retainerAmount, r.currency)}{" "}
                      <span className="text-muted-foreground text-xs">{r.currency}</span>
                    </td>
                    <td className="px-4 py-2">{FREQUENCY_LABEL[r.billingFrequency] ?? r.billingFrequency}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <GenerateInvoiceButton companyId={r.id} currency={r.currency} size="sm" />
                        <Link
                          href={`/account/companies/${r.id}/edit`}
                          className="text-muted-foreground hover:text-foreground text-xs"
                        >
                          Edit
                        </Link>
                        <form action={deleteCompany}>
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
