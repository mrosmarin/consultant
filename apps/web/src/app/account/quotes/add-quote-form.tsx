"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";

import { createQuote } from "./actions";

export type QuoteCompany = {
  id: string;
  name: string;
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

export function AddQuoteForm({ companies }: { companies: QuoteCompany[] }) {
  const [state, formAction, pending] = useActionState(createQuote, null);
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [discount, setDiscount] = useState({ type: "none", value: "" });

  if (companies.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Onboard a company first on the{" "}
        <Link href="/account/companies" className="text-brand underline">
          Companies
        </Link>{" "}
        page — quotes are issued to a company.
      </p>
    );
  }

  const selected = companies.find((c) => c.id === companyId);
  const fmt = (n: number) => formatMoney(n, selected?.currency);
  const setRow = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, blankRow()]);
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

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
  const taxRateNum = selected && !selected.taxExempt ? Number(selected.taxRate ?? 0) : 0;
  const taxApplies = taxRateNum > 0;
  const taxAmount = taxApplies ? Math.round(discounted * taxRateNum) / 100 : 0;
  const grandTotal = discounted + taxAmount;
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
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="" disabled>
              Select a company…
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" name="issueDate" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="validUntil">Valid until (optional)</Label>
          <Input id="validUntil" name="validUntil" type="date" />
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
                    <Input value={r.description} onChange={(e) => setRow(i, "description", e.target.value)} placeholder="Proposed work" />
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
              {discountAmount > 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-sm">
                    Discount{discount.type === "percent" ? ` (${discountValueNum}%)` : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">−{fmt(discountAmount)}</td>
                  <td />
                </tr>
              ) : null}
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
                <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium">Total</td>
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
        <Label>Discount (optional)</Label>
        <div className="flex gap-2">
          <select
            className={selectClass}
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
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      {state?.ok ? <p className="text-brand text-sm">Quote created.</p> : null}
      <Button type="submit" disabled={pending || !companyId}>
        {pending ? "Creating…" : "Create quote"}
      </Button>
    </form>
  );
}
