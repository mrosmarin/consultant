"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createInvoice } from "./actions";

export type PrefillLine = {
  description: string;
  quantity: string;
  unitAmount: string;
  sourceType: string | null;
  sourceId: string | null;
};

export type InvoicePrefill = {
  id: string;
  name: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  hours: number;
  billingType: string;
  lineItems: PrefillLine[];
  taxRate: string | null; // percent, e.g. "8.875"
  taxLabel: string | null;
  taxExempt: boolean;
};

type Row = {
  description: string;
  quantity: string;
  unitAmount: string;
  sourceType: string | null;
  sourceId: string | null;
};

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const blankRow = (): Row => ({
  description: "",
  quantity: "1",
  unitAmount: "",
  sourceType: "manual",
  sourceId: null,
});
const lineTotal = (r: Row) => (Number(r.quantity) || 0) * (Number(r.unitAmount) || 0);

const EMPTY = { invoiceNumber: "", issueDate: "", dueDate: "", notes: "" };
const NO_DISCOUNT = { type: "none", value: "" };

export function AddInvoiceForm({ prefills }: { prefills: InvoicePrefill[] }) {
  const [state, formAction, pending] = useActionState(createInvoice, null);
  const [companyId, setCompanyId] = useState("");
  const [fields, setFields] = useState(EMPTY);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [discount, setDiscount] = useState(NO_DISCOUNT);

  if (prefills.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Onboard a company first on the{" "}
        <Link href="/account/companies" className="text-brand underline">
          Companies
        </Link>{" "}
        page — invoices are issued to a company.
      </p>
    );
  }

  const onSelectCompany = (id: string) => {
    setCompanyId(id);
    const p = prefills.find((x) => x.id === id);
    if (!p) {
      setFields(EMPTY);
      setRows([blankRow()]);
      return;
    }
    setFields({
      invoiceNumber: p.invoiceNumber,
      issueDate: p.issueDate,
      dueDate: p.dueDate,
      notes: p.notes,
    });
    setRows(
      p.lineItems.length > 0
        ? p.lineItems.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitAmount: l.unitAmount,
            sourceType: l.sourceType,
            sourceId: l.sourceId,
          }))
        : [blankRow()],
    );
    setDiscount(NO_DISCOUNT);
  };

  const setField = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));
  const setRow = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, blankRow()]);
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  const selected = prefills.find((p) => p.id === companyId);
  const subtotal = rows.reduce((sum, r) => sum + lineTotal(r), 0);
  // Mirror the server's computeInvoiceTotals for a live preview (discount before
  // tax); the server value is authoritative on submit.
  const discountValueNum = Number(discount.value) || 0;
  const rawDiscount =
    discount.type === "percent"
      ? (subtotal * discountValueNum) / 100
      : discount.type === "fixed"
        ? discountValueNum
        : 0;
  const discountAmount = Math.min(Math.max(Math.round(rawDiscount * 100) / 100, 0), subtotal);
  const discounted = subtotal - discountAmount;
  const taxRateNum = selected && !selected.taxExempt ? Number(selected.taxRate ?? 0) : 0;
  const taxApplies = taxRateNum > 0;
  const taxAmount = taxApplies ? Math.round(discounted * taxRateNum) / 100 : 0;
  const grandTotal = discounted + taxAmount;
  const lineItemsJson = JSON.stringify(
    rows.map((r) => ({
      description: r.description,
      quantity: Number(r.quantity) || 0,
      unitAmount: Number(r.unitAmount) || 0,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
    })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lineItems" value={lineItemsJson} />
      <input type="hidden" name="discountType" value={discount.type} />
      <input type="hidden" name="discountValue" value={discount.value} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="companyId">Company</Label>
          <select
            id="companyId"
            name="companyId"
            required
            className={selectClass}
            value={companyId}
            onChange={(e) => onSelectCompany(e.target.value)}
          >
            <option value="" disabled>
              Select a company…
            </option>
            {prefills.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="invoiceNumber">Invoice #</Label>
          <Input
            id="invoiceNumber"
            name="invoiceNumber"
            placeholder="ACME-0001"
            value={fields.invoiceNumber}
            onChange={setField("invoiceNumber")}
            required
          />
        </div>
        <div className="grid gap-2" />
        <div className="grid gap-2">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input
            id="issueDate"
            name="issueDate"
            type="date"
            value={fields.issueDate}
            onChange={setField("issueDate")}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            value={fields.dueDate}
            onChange={setField("dueDate")}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Line items</Label>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="w-20 px-3 py-2 font-medium">Qty</th>
                <th className="w-28 px-3 py-2 font-medium">Unit</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">
                    <Input
                      value={r.description}
                      onChange={(e) => setRow(i, "description", e.target.value)}
                      placeholder="Work performed"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.quantity}
                      onChange={(e) => setRow(i, "quantity", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.unitAmount}
                      onChange={(e) => setRow(i, "unitAmount", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{usd.format(lineTotal(r))}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-muted-foreground hover:text-destructive text-xs"
                      aria-label="Remove line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={3} className="px-3 py-2 text-right text-sm">
                  Subtotal
                </td>
                <td className="px-3 py-2 text-right font-mono">{usd.format(subtotal)}</td>
                <td />
              </tr>
              {discountAmount > 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-sm">
                    Discount{discount.type === "percent" ? ` (${discountValueNum}%)` : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">−{usd.format(discountAmount)}</td>
                  <td />
                </tr>
              ) : null}
              {taxApplies ? (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-sm">
                    {selected?.taxLabel?.trim() || "Tax"} ({taxRateNum}%)
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{usd.format(taxAmount)}</td>
                  <td />
                </tr>
              ) : null}
              <tr className="border-t">
                <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium">
                  Total
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">
                  {usd.format(grandTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add line
        </Button>
      </div>

      <div className="grid gap-2 sm:max-w-sm">
        <Label>Discount (optional)</Label>
        <div className="flex gap-2">
          <select
            className={selectClass}
            value={discount.type}
            onChange={(e) =>
              setDiscount((d) => ({ ...d, type: e.target.value, value: e.target.value === "none" ? "" : d.value }))
            }
            aria-label="Discount type"
          >
            <option value="none">No discount</option>
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed ($)</option>
          </select>
          {discount.type !== "none" ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              max={discount.type === "percent" ? "100" : undefined}
              value={discount.value}
              onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))}
              placeholder={discount.type === "percent" ? "e.g. 10" : "e.g. 50.00"}
              className="max-w-32"
            />
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">Applied to the subtotal before tax.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} value={fields.notes} onChange={setField("notes")} />
      </div>

      {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      {state?.ok ? <p className="text-brand text-sm">Invoice created.</p> : null}
      <Button type="submit" disabled={pending || !companyId}>
        {pending ? "Creating…" : "Create invoice"}
      </Button>
    </form>
  );
}
