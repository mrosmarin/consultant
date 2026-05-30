"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";

import { updateInvoice } from "./actions";

type Row = {
  description: string;
  quantity: string;
  unitAmount: string;
  sourceType: string | null;
  sourceId: string | null;
};

export type EditInvoiceData = {
  id: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  discountType: string; // "none" | "percent" | "fixed"
  discountValue: string;
  taxRate: string | null;
  taxLabel: string | null;
  taxExempt: boolean;
  lines: Row[];
};

const blankRow = (): Row => ({
  description: "",
  quantity: "1",
  unitAmount: "",
  sourceType: "manual",
  sourceId: null,
});
const lineTotal = (r: Row) => (Number(r.quantity) || 0) * (Number(r.unitAmount) || 0);

export function EditInvoiceForm({ invoice }: { invoice: EditInvoiceData }) {
  const [state, formAction, pending] = useActionState(updateInvoice, null);
  const [issueDate, setIssueDate] = useState(invoice.issueDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [notes, setNotes] = useState(invoice.notes);
  const [rows, setRows] = useState<Row[]>(invoice.lines.length ? invoice.lines : [blankRow()]);
  const [discount, setDiscount] = useState({ type: invoice.discountType, value: invoice.discountValue });

  const fmt = (n: number) => formatMoney(n, invoice.currency);
  const setRow = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, blankRow()]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));
  const move = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const subtotal = rows.reduce((sum, r) => sum + lineTotal(r), 0);
  const discountValueNum = Number(discount.value) || 0;
  const rawDiscount =
    discount.type === "percent"
      ? (subtotal * discountValueNum) / 100
      : discount.type === "fixed"
        ? discountValueNum
        : 0;
  const discountAmount = Math.min(Math.max(Math.round(rawDiscount * 100) / 100, 0), subtotal);
  const discounted = subtotal - discountAmount;
  const taxRateNum = !invoice.taxExempt ? Number(invoice.taxRate ?? 0) : 0;
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
      <input type="hidden" name="id" value={invoice.id} />
      <input type="hidden" name="lineItems" value={lineItemsJson} />
      <input type="hidden" name="discountType" value={discount.type} />
      <input type="hidden" name="discountValue" value={discount.value} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" name="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Line items</Label>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="w-16 px-3 py-2 font-medium">Order</th>
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
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === rows.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input value={r.description} onChange={(e) => setRow(i, "description", e.target.value)} placeholder="Work performed" />
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
                <td colSpan={4} className="px-3 py-2 text-right text-sm">Subtotal</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(subtotal)}</td>
                <td />
              </tr>
              {discountAmount > 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-sm">
                    Discount{discount.type === "percent" ? ` (${discountValueNum}%)` : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">−{fmt(discountAmount)}</td>
                  <td />
                </tr>
              ) : null}
              {taxApplies ? (
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-sm">
                    {invoice.taxLabel?.trim() || "Tax"} ({taxRateNum}%)
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(taxAmount)}</td>
                  <td />
                </tr>
              ) : null}
              <tr className="border-t">
                <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium">Total</td>
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

      <div className="grid gap-2 sm:max-w-sm">
        <Label>Discount</Label>
        <div className="flex gap-2">
          <select
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={discount.type}
            onChange={(e) => setDiscount((d) => ({ ...d, type: e.target.value, value: e.target.value === "none" ? "" : d.value }))}
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
              className="max-w-32"
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      {state?.ok ? <p className="text-brand text-sm">Saved.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save invoice"}
      </Button>
    </form>
  );
}
