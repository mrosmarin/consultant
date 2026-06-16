"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  companies,
  companyContacts,
  companyMilestones,
  expenses,
  invoices,
  invoiceLineItems,
  timeEntries,
  INVOICE_STATUSES,
  type InvoiceStatus,
} from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { buildInvoiceDraft, computeInvoiceTotals, insertInvoiceLineItems, type DraftLineItem } from "@/lib/invoicing";
import { parseLineItems, parseDiscount } from "@/lib/invoice-input";
import { sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { InvoicePdf, invoicePdfDataFrom } from "@/lib/pdf/invoice-pdf";
import { getBusinessSettings, issuerInfo } from "@/lib/business-settings";

export type InvoiceState = { ok: boolean; error?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email an invoice to the client with the branded PDF attached (DEV-76). The
// recipient is an optional override, else the company's primary contact email,
// else its legacy contact email. On success the invoice is marked sent.
export async function sendInvoice(_prev: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const id = ((formData.get("id") as string) ?? "").trim();
  const toOverride = ((formData.get("to") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Missing invoice." };

  const [inv] = await db
    .select({
      id: invoices.id,
      companyId: invoices.companyId,
      invoiceNumber: invoices.invoiceNumber,
      companyName: companies.name,
      contactEmail: companies.contactEmail,
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
      status: invoices.status,
      publicToken: invoices.publicToken,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.userId, session.user.id),
        eq(invoices.type, "invoice"),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);
  if (!inv) return { ok: false, error: "Invoice not found." };

  // Resolve recipient: override → primary contact → legacy company contact.
  let to = toOverride;
  if (!to && inv.companyId) {
    const [primary] = await db
      .select({ email: companyContacts.email })
      .from(companyContacts)
      .where(
        and(
          eq(companyContacts.companyId, inv.companyId),
          eq(companyContacts.userId, session.user.id),
          eq(companyContacts.isPrimary, true),
          isNull(companyContacts.deletedAt),
        ),
      )
      .limit(1);
    to = primary?.email ?? inv.contactEmail ?? "";
  }
  if (!EMAIL_RE.test(to)) {
    return { ok: false, error: "No valid recipient — add a primary contact email on the company, or enter one." };
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

  const issuer = issuerInfo(await getBusinessSettings(session.user.id));
  const buffer = await renderToBuffer(
    InvoicePdf({ data: invoicePdfDataFrom(inv, lines, issuer) }),
  );
  const pdfBase64 = Buffer.from(buffer).toString("base64");

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "endlessworlds.xyz"}`;
  const link = `${origin}/invoice/${inv.publicToken}`;
  const total = formatMoney(Number(inv.amount), inv.currency);

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#1f2937">
      <p>Hello,</p>
      <p>Please find attached invoice <strong>${inv.invoiceNumber}</strong> from EndlessWorlds, LLC for <strong>${total}</strong>${inv.dueDate ? `, due <strong>${inv.dueDate}</strong>` : ""}.</p>
      <p>You can also view it online: <a href="${link}">${link}</a></p>
      <p>Thank you for your business.<br/>EndlessWorlds, LLC</p>
    </div>`;

  const result = await sendEmail({
    to,
    subject: `Invoice ${inv.invoiceNumber} from EndlessWorlds, LLC`,
    html,
    attachments: [{ filename: `${inv.invoiceNumber}.pdf`, content: pdfBase64 }],
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Failed to send." };

  await db
    .update(invoices)
    .set({
      sentAt: new Date(),
      sentTo: to,
      status: inv.status === "draft" || inv.status === "viewed" ? "sent" : inv.status,
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)));

  revalidatePath("/account/invoices");
  return { ok: true };
}

export async function createInvoice(
  _prev: InvoiceState,
  formData: FormData,
): Promise<InvoiceState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const invoiceNumber = (formData.get("invoiceNumber") as string)?.trim();
  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const issueDate = (formData.get("issueDate") as string)?.trim();
  const dueDate = (formData.get("dueDate") as string)?.trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const lineItemsRaw = (formData.get("lineItems") as string) ?? "";

  if (!invoiceNumber || !companyId || !issueDate || !dueDate) {
    return { ok: false, error: "Invoice #, company, and dates are required." };
  }
  if (dueDate < issueDate) {
    return { ok: false, error: "Due date can't be before the issue date." };
  }

  const parsed = parseLineItems(lineItemsRaw);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const discountParsed = parseDiscount(
    ((formData.get("discountType") as string) ?? "").trim(),
    ((formData.get("discountValue") as string) ?? "").trim(),
  );
  if ("error" in discountParsed) return { ok: false, error: discountParsed.error };

  // Line totals are derived server-side (never trust a client total). Each line
  // keeps its source (a time entry) so partial billing can stamp only those.
  const lines: DraftLineItem[] = parsed.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toFixed(2),
    unitAmount: l.unitAmount.toFixed(2),
    lineTotal: (l.quantity * l.unitAmount).toFixed(2),
    sourceType: l.sourceType ?? "manual",
    sourceId: l.sourceId,
  }));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  if (subtotal <= 0) return { ok: false, error: "Invoice total must be greater than zero." };

  // Verify the company is one the signed-in user owns (not soft-deleted).
  const [company] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.id, companyId),
        eq(companies.userId, session.user.id),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1);
  if (!company) return { ok: false, error: "Pick one of your companies." };

  // The form is an editable "Generate": the invoice carries the (possibly edited)
  // lines, but for an hourly company we still bill the underlying unbilled hours
  // so the same time can't be invoiced twice. The draft tells us which to stamp.
  const draft = await buildInvoiceDraft(company, session.user.id);

  // Discount (before tax) and tax are snapshotted onto the invoice from the
  // line subtotal + company config — never trusted from the client (DEV-116/118).
  const totals = computeInvoiceTotals(subtotal, company, discountParsed.discount);

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId: session.user.id,
      companyId,
      invoiceNumber,
      issueDate,
      dueDate,
      currency: company.currency,
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxLabel: totals.taxLabel,
      taxAmount: totals.taxAmount,
      amount: totals.amount,
      status: "draft",
      notes,
    })
    .returning({ id: invoices.id });

  await insertInvoiceLineItems(session.user.id, invoice.id, lines);

  // Partial billing (DEV-118): stamp ONLY the time entries whose lines made it
  // onto this invoice — and only ones the draft says are legitimately billable
  // (guards against a tampered sourceId). Dropping a time line leaves it unbilled.
  const draftIds = new Set(draft.billedEntryIds);
  const billedIds = lines
    .filter((l) => l.sourceType === "time" && l.sourceId && draftIds.has(l.sourceId))
    .map((l) => l.sourceId as string);
  if (billedIds.length > 0) {
    await db
      .update(timeEntries)
      .set({ billedAt: new Date(), billedInvoiceId: invoice.id })
      .where(inArray(timeEntries.id, billedIds));
  }

  // Same for milestones (DEV-119): mark invoiced only the pending milestones
  // whose lines were submitted (and are legitimately in the draft).
  const draftMilestoneIds = new Set(draft.billedMilestoneIds);
  const milestoneIds = lines
    .filter((l) => l.sourceType === "milestone" && l.sourceId && draftMilestoneIds.has(l.sourceId))
    .map((l) => l.sourceId as string);
  if (milestoneIds.length > 0) {
    await db
      .update(companyMilestones)
      .set({ status: "invoiced", invoicedInvoiceId: invoice.id })
      .where(inArray(companyMilestones.id, milestoneIds));
  }

  // Same for billable expenses (DEV-123): stamp only the ones whose lines were
  // submitted and are legitimately in the draft.
  const draftExpenseIds = new Set(draft.billedExpenseIds);
  const expenseIds = lines
    .filter((l) => l.sourceType === "expense" && l.sourceId && draftExpenseIds.has(l.sourceId))
    .map((l) => l.sourceId as string);
  if (expenseIds.length > 0) {
    await db
      .update(expenses)
      .set({ billedAt: new Date(), billedInvoiceId: invoice.id })
      .where(inArray(expenses.id, expenseIds));
  }

  revalidatePath("/account/invoices");
  revalidatePath("/account/companies");
  revalidatePath("/account/expenses");
  revalidatePath("/account");
  return { ok: true };
}

// Edit a DRAFT invoice's line items (add/edit/remove + reorder via submit order),
// discount, dates and notes; recompute the money breakdown (DEV-139). Tax config
// is re-read from the company; currency is kept as captured. Sent/paid invoices
// are locked. Line items are replaced (old ones soft-deleted). Does NOT re-stamp
// time entries / milestones — those were settled at create.
export async function updateInvoice(_prev: InvoiceState, formData: FormData): Promise<InvoiceState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const id = ((formData.get("id") as string) ?? "").trim();
  const issueDate = (formData.get("issueDate") as string)?.trim();
  const dueDate = (formData.get("dueDate") as string)?.trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  if (!id || !issueDate || !dueDate) {
    return { ok: false, error: "Invoice, issue date, and due date are required." };
  }
  if (dueDate < issueDate) {
    return { ok: false, error: "Due date can't be before the issue date." };
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id), isNull(invoices.deletedAt)))
    .limit(1);
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "draft") {
    return { ok: false, error: "Only draft invoices can be edited. Set it back to draft first." };
  }

  const parsed = parseLineItems((formData.get("lineItems") as string) ?? "");
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const discountParsed = parseDiscount(
    ((formData.get("discountType") as string) ?? "").trim(),
    ((formData.get("discountValue") as string) ?? "").trim(),
  );
  if ("error" in discountParsed) return { ok: false, error: discountParsed.error };

  const lines: DraftLineItem[] = parsed.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity.toFixed(2),
    unitAmount: l.unitAmount.toFixed(2),
    lineTotal: (l.quantity * l.unitAmount).toFixed(2),
    sourceType: l.sourceType ?? "manual",
    sourceId: l.sourceId,
  }));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  if (subtotal <= 0) return { ok: false, error: "Invoice total must be greater than zero." };

  // Tax config comes from the company (unchanged); currency stays as captured.
  // If the company is gone, fall back to the invoice's own snapshotted tax rate.
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, invoice.companyId ?? ""), eq(companies.userId, session.user.id)))
    .limit(1);
  const taxConfig = company
    ? { taxRate: company.taxRate, taxLabel: company.taxLabel, taxExempt: company.taxExempt }
    : { taxRate: invoice.taxRate, taxLabel: invoice.taxLabel, taxExempt: false };
  const totals = computeInvoiceTotals(subtotal, taxConfig, discountParsed.discount);

  await db
    .update(invoices)
    .set({
      issueDate,
      dueDate,
      notes,
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxLabel: totals.taxLabel,
      taxAmount: totals.taxAmount,
      amount: totals.amount,
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)));

  // Replace line items: soft-delete the old set, insert the new (submit order =
  // sort order, so move-up/down reordering persists).
  await db
    .update(invoiceLineItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(invoiceLineItems.invoiceId, id),
        eq(invoiceLineItems.userId, session.user.id),
        isNull(invoiceLineItems.deletedAt),
      ),
    );
  await insertInvoiceLineItems(session.user.id, id, lines);

  revalidatePath("/account/invoices");
  revalidatePath("/account");
  return { ok: true };
}

export async function updateInvoiceStatus(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !INVOICE_STATUSES.includes(status as InvoiceStatus)) return;

  await db
    .update(invoices)
    .set({ status })
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)));
  revalidatePath("/account/invoices");
  revalidatePath("/account");
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = formData.get("id") as string;
  if (!id) return;

  const uid = session.user.id;
  await db
    .update(invoices)
    .set({ deletedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, uid)));

  // Release everything this invoice billed so the work can be re-invoiced
  // (DEV-154). Without this, the time entries / expenses / milestones stay
  // stamped against the now-deleted invoice and never resurface to generate.
  await db
    .update(timeEntries)
    .set({ billedAt: null, billedInvoiceId: null })
    .where(and(eq(timeEntries.billedInvoiceId, id), eq(timeEntries.userId, uid)));
  await db
    .update(expenses)
    .set({ billedAt: null, billedInvoiceId: null })
    .where(and(eq(expenses.billedInvoiceId, id), eq(expenses.userId, uid)));
  await db
    .update(companyMilestones)
    .set({ status: "pending", invoicedInvoiceId: null })
    .where(and(eq(companyMilestones.invoicedInvoiceId, id), eq(companyMilestones.userId, uid)));

  revalidatePath("/account/invoices");
  revalidatePath("/account");
  revalidatePath("/account/timesheets");
  revalidatePath("/account/expenses");
}
