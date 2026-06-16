import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

import { formatMoney } from "@/lib/money";
import type { IssuerInfo } from "@/lib/business-settings";

// Branded invoice/quote/credit-note PDF (DEV-76). Pure @react-pdf/renderer — no
// headless browser, renders in a Node route handler. Email delivery is deferred
// until an email provider is configured.

export type InvoicePdfData = {
  docLabel: string; // "Invoice" | "Quote" | "Credit note"
  number: string;
  companyName: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  subtotal: string | null;
  discountAmount: string | null;
  discountType: string | null;
  discountValue: string | null;
  taxLabel: string | null;
  taxRate: string | null;
  taxAmount: string | null;
  amount: string;
  notes: string | null;
  paymentTermsDays: number | null;
  issuer: IssuerInfo;
  lines: { description: string; quantity: string; unitAmount: string; lineTotal: string }[];
};

// Map an invoice row (+ its lines) to the PDF data shape. Shared by the public
// PDF route and the email-send action so the rendered document stays identical.
export function invoicePdfDataFrom(
  inv: {
    invoiceNumber: string;
    companyName: string | null;
    paymentTermsDays: number | null;
    issueDate: string;
    dueDate: string | null;
    currency: string;
    subtotal: string | null;
    discountAmount: string | null;
    discountType: string | null;
    discountValue: string | null;
    taxLabel: string | null;
    taxRate: string | null;
    taxAmount: string | null;
    amount: string;
    notes: string | null;
  },
  lines: { description: string; quantity: string; unitAmount: string; lineTotal: string }[],
  issuer: IssuerInfo,
): InvoicePdfData {
  return {
    docLabel: "Invoice",
    number: inv.invoiceNumber,
    issuer,
    companyName: inv.companyName,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    currency: inv.currency,
    subtotal: inv.subtotal,
    discountAmount: inv.discountAmount,
    discountType: inv.discountType,
    discountValue: inv.discountValue,
    taxLabel: inv.taxLabel,
    taxRate: inv.taxRate,
    taxAmount: inv.taxAmount,
    amount: inv.amount,
    notes: inv.notes,
    paymentTermsDays: inv.paymentTermsDays,
    lines,
  };
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111827" },
  muted: { color: "#6b7280" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  section: { marginTop: 24 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e5e7eb", paddingBottom: 4, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  cDesc: { flex: 1 },
  cQty: { width: 50, textAlign: "right" },
  cUnit: { width: 70, textAlign: "right" },
  cTotal: { width: 80, textAlign: "right" },
  totalsBox: { marginTop: 12, marginLeft: "auto", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTopWidth: 1, borderColor: "#e5e7eb", fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9ca3af", borderTopWidth: 1, borderColor: "#e5e7eb", paddingTop: 8 },
});

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const fmt = (v: string | number) => formatMoney(Number(v), data.currency);
  const hasDiscount = Number(data.discountAmount ?? 0) > 0;
  const hasTax = Number(data.taxAmount ?? 0) > 0;
  return (
    <Document title={`${data.docLabel} ${data.number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.brand}>{data.issuer.legalName}</Text>
            {data.issuer.addressLines.map((line, i) => (
              <Text key={i} style={s.muted}>
                {line}
              </Text>
            ))}
            {data.issuer.taxId ? (
              <Text style={s.muted}>Tax ID: {data.issuer.taxId}</Text>
            ) : null}
          </View>
          <View>
            <Text style={s.docTitle}>{data.docLabel.toUpperCase()}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>{data.number}</Text>
          </View>
        </View>

        <View style={[s.section, s.row]}>
          <View>
            <Text style={s.muted}>Billed to</Text>
            <Text>{data.companyName ?? "—"}</Text>
          </View>
          <View>
            <Text style={[s.muted, { textAlign: "right" }]}>Issued {data.issueDate}</Text>
            {data.dueDate ? (
              <Text style={[s.muted, { textAlign: "right" }]}>Due {data.dueDate}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.section}>
          <View style={s.th}>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cUnit}>Unit</Text>
            <Text style={s.cTotal}>Amount</Text>
          </View>
          {data.lines.map((l, i) => (
            <View style={s.tr} key={i}>
              <Text style={s.cDesc}>{l.description}</Text>
              <Text style={s.cQty}>{Number(l.quantity)}</Text>
              <Text style={s.cUnit}>{fmt(l.unitAmount)}</Text>
              <Text style={s.cTotal}>{fmt(l.lineTotal)}</Text>
            </View>
          ))}

          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.muted}>Subtotal</Text>
              <Text>{fmt(data.subtotal ?? data.amount)}</Text>
            </View>
            {hasDiscount ? (
              <View style={s.totalRow}>
                <Text style={s.muted}>
                  Discount{data.discountType === "percent" ? ` (${Number(data.discountValue)}%)` : ""}
                </Text>
                <Text>-{fmt(data.discountAmount!)}</Text>
              </View>
            ) : null}
            {hasTax ? (
              <View style={s.totalRow}>
                <Text style={s.muted}>
                  {data.taxLabel ?? "Tax"} ({Number(data.taxRate)}%)
                </Text>
                <Text>{fmt(data.taxAmount!)}</Text>
              </View>
            ) : null}
            <View style={s.grandRow}>
              <Text>Total {data.docLabel === "Credit note" ? "credited" : "due"}</Text>
              <Text>{fmt(data.amount)}</Text>
            </View>
          </View>
        </View>

        {data.notes ? (
          <View style={s.section}>
            <Text style={s.muted}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.muted}>Payment</Text>
          <Text>
            {data.docLabel === "Invoice"
              ? data.paymentTermsDays === 0
                ? "Due on receipt."
                : `Net ${data.paymentTermsDays ?? 30} — due by ${data.dueDate ?? "the due date"}.`
              : "This document is for reference and is not a payment request."}
          </Text>
          {data.docLabel === "Invoice"
            ? data.issuer.paymentLines.length
              ? data.issuer.paymentLines.map((line, i) => (
                  <Text key={i} style={s.muted}>
                    {line}
                  </Text>
                ))
              : <Text style={s.muted}>Contact us for payment details.</Text>
            : null}
        </View>

        <Text style={s.footer} fixed>
          {data.issuer.legalName} · Thank you for your business.
        </Text>
      </Page>
    </Document>
  );
}
