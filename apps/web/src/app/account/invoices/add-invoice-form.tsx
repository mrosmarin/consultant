"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createInvoice } from "./actions";

export type InvoicePrefill = {
  id: string;
  name: string;
  invoiceNumber: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  hours: number;
  billingType: string;
};

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

const EMPTY = { invoiceNumber: "", amount: "", issueDate: "", dueDate: "", notes: "" };

export function AddInvoiceForm({ prefills }: { prefills: InvoicePrefill[] }) {
  const [state, formAction, pending] = useActionState(createInvoice, null);
  const [companyId, setCompanyId] = useState("");
  const [fields, setFields] = useState(EMPTY);

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

  // Selecting a company auto-fills the editable fields from its current draft
  // (next number, amount from the latest period, due date, period notes).
  const onSelectCompany = (id: string) => {
    setCompanyId(id);
    const p = prefills.find((x) => x.id === id);
    setFields(
      p
        ? {
            invoiceNumber: p.invoiceNumber,
            amount: p.amount,
            issueDate: p.issueDate,
            dueDate: p.dueDate,
            notes: p.notes,
          }
        : EMPTY,
    );
  };

  const selected = prefills.find((x) => x.id === companyId);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
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
        {selected && selected.billingType === "hourly" ? (
          <p className="text-muted-foreground text-xs">
            {selected.hours > 0
              ? `${selected.hours} unbilled hrs in the latest period — auto-filled below. Saving marks them billed.`
              : "No unbilled hours in the latest period — enter an amount manually if needed."}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="invoiceNumber">Invoice #</Label>
        <Input
          id="invoiceNumber"
          name="invoiceNumber"
          placeholder="ACME-0001"
          value={fields.invoiceNumber}
          onChange={set("invoiceNumber")}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Amount (USD)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          value={fields.amount}
          onChange={set("amount")}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issueDate">Issue date</Label>
        <Input
          id="issueDate"
          name="issueDate"
          type="date"
          value={fields.issueDate}
          onChange={set("issueDate")}
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
          onChange={set("dueDate")}
          required
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} value={fields.notes} onChange={set("notes")} />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Invoice created.</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || !companyId}>
          {pending ? "Creating…" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}
