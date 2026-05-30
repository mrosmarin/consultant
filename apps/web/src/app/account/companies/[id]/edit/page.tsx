import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { auth } from "@/lib/auth/server";

import { CompanyForm } from "../../company-form";
import { GenerateInvoiceButton } from "../../generate-invoice-button";

export const dynamic = "force-dynamic";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const [company] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.id, id),
        eq(companies.userId, session.user.id),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1);

  if (!company) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/account/companies"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to companies
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{company.name}</h1>
        <p className="text-muted-foreground text-sm">Edit company details and billing terms.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyForm
            company={{
              id: company.id,
              name: company.name,
              contactName: company.contactName,
              contactEmail: company.contactEmail,
              address: company.address,
              notes: company.notes,
              billingType: company.billingType,
              hourlyRate: company.hourlyRate,
              retainerAmount: company.retainerAmount,
              billingFrequency: company.billingFrequency,
              billingAnchorDay: company.billingAnchorDay,
              paymentTermsDays: company.paymentTermsDays,
              invoicePrefix: company.invoicePrefix,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Generate a draft invoice for the latest completed billing period
            {company.billingType === "hourly"
              ? " from this company's unbilled time."
              : " for the retainer amount."}
          </p>
          <GenerateInvoiceButton companyId={company.id} />
        </CardContent>
      </Card>
    </div>
  );
}
