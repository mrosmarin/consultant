"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";

import { recordPayment } from "./actions";

export type PayableInvoice = {
  id: string;
  label: string;
  currency: string;
  outstanding: number;
};

const METHODS = [
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

export function AddPaymentForm({ invoices }: { invoices: PayableInvoice[] }) {
  const [state, formAction, pending] = useActionState(recordPayment, null);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");

  if (invoices.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Create an{" "}
        <Link href="/account/invoices" className="text-brand underline">
          invoice
        </Link>{" "}
        first — payments are recorded against an invoice.
      </p>
    );
  }

  const selected = invoices.find((i) => i.id === invoiceId);

  const onSelect = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    // Prefill with the outstanding balance — the common case (paid in full).
    setAmount(inv && inv.outstanding > 0 ? inv.outstanding.toFixed(2) : "");
  };

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="invoiceId">Invoice</Label>
        <select
          id="invoiceId"
          name="invoiceId"
          required
          className={selectClass}
          value={invoiceId}
          onChange={(e) => onSelect(e.target.value)}
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
        {selected ? (
          <p className="text-muted-foreground text-xs">
            Outstanding: {formatMoney(selected.outstanding, selected.currency)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="method">Method</Label>
        <select id="method" name="method" className={selectClass} defaultValue="check">
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="receivedDate">Received</Label>
        <Input id="receivedDate" name="receivedDate" type="date" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reference">Reference (e.g. check #)</Label>
        <Input id="reference" name="reference" placeholder="optional" />
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {state?.error ? (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Payment recorded.</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || !invoiceId}>
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
