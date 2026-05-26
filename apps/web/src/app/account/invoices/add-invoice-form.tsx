"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createInvoice } from "./actions";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const todayISO = iso(today);
const dueISO = iso(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));

export function AddInvoiceForm() {
  const [state, formAction, pending] = useActionState(createInvoice, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="invoiceNumber">Invoice #</Label>
        <Input id="invoiceNumber" name="invoiceNumber" placeholder="INV-001" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Amount (USD)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="client">Client</Label>
        <Input id="client" name="client" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issueDate">Issue date</Label>
        <Input id="issueDate" name="issueDate" type="date" defaultValue={todayISO} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dueDate">Due date</Label>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={dueISO} required />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Invoice created.</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}
