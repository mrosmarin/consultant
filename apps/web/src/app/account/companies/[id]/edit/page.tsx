import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, companyContacts } from "@/db/schema";
import { auth } from "@/lib/auth/server";

import { CompanyForm } from "../../company-form";
import { CompanyContacts } from "../../company-contacts";
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

  const contacts = await db
    .select({
      id: companyContacts.id,
      name: companyContacts.name,
      email: companyContacts.email,
      phone: companyContacts.phone,
      role: companyContacts.role,
      isPrimary: companyContacts.isPrimary,
    })
    .from(companyContacts)
    .where(
      and(
        eq(companyContacts.companyId, company.id),
        eq(companyContacts.userId, session.user.id),
        isNull(companyContacts.deletedAt),
      ),
    )
    .orderBy(asc(companyContacts.name));

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
              taxRate: company.taxRate,
              taxLabel: company.taxLabel,
              taxExempt: company.taxExempt,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyContacts companyId={company.id} contacts={contacts} />
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
