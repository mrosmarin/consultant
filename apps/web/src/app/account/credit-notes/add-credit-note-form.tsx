"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";

import { createCreditNote } from "./actions";

export type CreditableInvoice = {
  id: string;
  label: string;
  currency: string;
  taxRate: string | null;
  taxLabel: string | null;
  taxExempt: boolean;
};

type Row = { description: string; quantity: string; unitAmount: string };

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";
const blankRow = (): Row => ({ description: "", quantity: "1", unitAmount: "" });
const lineTotal = (r: Row) => (Number(r.quantity) || 0) * (Number(r.unitAmount) || 0);

export function AddCreditNoteForm({ invoices }: { invoices: CreditableInvoice[] }) {
  const [state, formAction, pending] = useActionState(createCreditNote, null);
  const [invoiceId, setInvoiceId] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);

  if (invoices.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Create an{" "}
        <Link href="/account/invoices" className="text-brand underline">
          invoice
        </Link>{" "}
        first — credit notes are issued against an invoice.
      </p>
    );
  }

  const selected = invoices.find((i) => i.id === invoiceId);
  const fmt = (n: number) => formatMoney(n, selected?.currency);
  const setRow = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, blankRow()]);
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  const subtotal = rows.reduce((sum, r) => sum + lineTotal(r), 0);
  const taxRateNum = selected && !selected.taxExempt ? Number(selected.taxRate ?? 0) : 0;
  const taxApplies = taxRateNum > 0;
  const taxAmount = taxApplies ? Math.round(subtotal * taxRateNum) / 100 : 0;
  const grandTotal = subtotal + taxAmount;
  const lineItemsJson = JSON.stringify(
    rows.map((r) => ({
      description: r.description,
      quantity: Number(r.quantity) || 0,
      unitAmount: Number(r.unitAmount) || 0,
    })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lineItems" value={lineItemsJson} />

      <div className="grid gap-2">
        <Label htmlFor="invoiceId">Credit against invoice</Label>
        <select
          id="invoiceId"
          name="invoiceId"
          required
          className={selectClass}
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
        >
          <option value="" disabled>
            Select an invoice…
          </option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Credit line items</Label>
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
                    <Input value={r.description} onChange={(e) => setRow(i, "description", e.target.value)} placeholder="Reason / item credited" />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" step="0.01" min="0" value={r.quantity} onChange={(e) => setRow(i, "quantity", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" step="0.01" min="0" value={r.unitAmount} onChange={(e) => setRow(i, "unitAmount", e.target.value)} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(lineTotal(r))}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive text-xs" aria-label="Remove line">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={3} className="px-3 py-2 text-right text-sm">Subtotal</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(subtotal)}</td>
                <td />
              </tr>
              {taxApplies ? (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-sm">
                    {selected?.taxLabel?.trim() || "Tax"} ({taxRateNum}%)
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(taxAmount)}</td>
                  <td />
                </tr>
              ) : null}
              <tr className="border-t">
                <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium">Credit total</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(grandTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add line
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Reason (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Why this credit is being issued" />
      </div>

      {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      {state?.ok ? <p className="text-brand text-sm">Credit note issued.</p> : null}
      <Button type="submit" disabled={pending || !invoiceId}>
        {pending ? "Issuing…" : "Issue credit note"}
      </Button>
    </form>
  );
}
