import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, companyContacts, companyDocuments, companyMilestones } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/rbac";

import { CompanyForm } from "../../company-form";
import { CompanyContacts } from "../../company-contacts";
import { CompanyDocuments } from "../../company-documents";
import { CompanyMilestones } from "../../company-milestones";
import { GenerateInvoiceButton } from "../../generate-invoice-button";

export const dynamic = "force-dynamic";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  await requireAdmin(); // admin-only section -- team members get /forbidden (DEV-141)

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

  const documents = await db
    .select({
      id: companyDocuments.id,
      name: companyDocuments.name,
      contentType: companyDocuments.contentType,
      sizeBytes: companyDocuments.sizeBytes,
      createdAt: companyDocuments.createdAt,
    })
    .from(companyDocuments)
    .where(
      and(
        eq(companyDocuments.companyId, company.id),
        eq(companyDocuments.userId, session.user.id),
        isNull(companyDocuments.deletedAt),
      ),
    )
    .orderBy(asc(companyDocuments.name));

  const milestones =
    company.billingType === "milestone"
      ? await db
          .select({
            id: companyMilestones.id,
            name: companyMilestones.name,
            amount: companyMilestones.amount,
            status: companyMilestones.status,
            dueDate: companyMilestones.dueDate,
          })
          .from(companyMilestones)
          .where(
            and(
              eq(companyMilestones.companyId, company.id),
              eq(companyMilestones.userId, session.user.id),
              isNull(companyMilestones.deletedAt),
            ),
          )
          .orderBy(asc(companyMilestones.sortOrder), asc(companyMilestones.createdAt))
      : [];

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
              fixedAmount: company.fixedAmount,
              billingFrequency: company.billingFrequency,
              billingAnchorDay: company.billingAnchorDay,
              paymentTermsDays: company.paymentTermsDays,
              invoicePrefix: company.invoicePrefix,
              currency: company.currency,
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
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyDocuments
            companyId={company.id}
            documents={documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
          />
        </CardContent>
      </Card>

      {company.billingType === "milestone" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyMilestones
              companyId={company.id}
              currency={company.currency}
              milestones={milestones}
            />
          </CardContent>
        </Card>
      ) : null}

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
