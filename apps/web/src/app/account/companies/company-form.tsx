"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { saveCompany } from "./actions";

// Kept local (not imported from the Drizzle schema) so this client bundle
// doesn't pull the server-only db module. Must stay in sync with BILLING_TYPES
// / BILLING_FREQUENCIES in src/db/schema.ts.
const BILLING_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly rate" },
  { value: "retainer", label: "Flat retainer" },
] as const;

const BILLING_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "semimonthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
] as const;

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

export type CompanyFormValues = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  address: string | null;
  notes: string | null;
  billingType: string;
  hourlyRate: string | null;
  retainerAmount: string | null;
  billingFrequency: string;
  billingAnchorDay: number | null;
};

export function CompanyForm({ company }: { company?: CompanyFormValues }) {
  const [state, formAction, pending] = useActionState(saveCompany, null);
  const [billingType, setBillingType] = useState(company?.billingType ?? "hourly");
  const editing = Boolean(company);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {editing ? <input type="hidden" name="id" value={company!.id} /> : null}

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" defaultValue={company?.name ?? ""} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contactName">Contact name (optional)</Label>
        <Input id="contactName" name="contactName" defaultValue={company?.contactName ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contactEmail">Contact email (optional)</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={company?.contactEmail ?? ""}
        />
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" defaultValue={company?.address ?? ""} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="billingType">Billing type</Label>
        <select
          id="billingType"
          name="billingType"
          value={billingType}
          onChange={(e) => setBillingType(e.target.value)}
          className={selectClass}
        >
          {BILLING_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="billingFrequency">Billing frequency</Label>
        <select
          id="billingFrequency"
          name="billingFrequency"
          defaultValue={company?.billingFrequency ?? "monthly"}
          className={selectClass}
        >
          {BILLING_FREQUENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {billingType === "hourly" ? (
        <div className="grid gap-2">
          <Label htmlFor="hourlyRate">Hourly rate (USD)</Label>
          <Input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={company?.hourlyRate ?? ""}
          />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="retainerAmount">Retainer amount (USD / period)</Label>
          <Input
            id="retainerAmount"
            name="retainerAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={company?.retainerAmount ?? ""}
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="billingAnchorDay">Billing anchor day (optional)</Label>
        <Input
          id="billingAnchorDay"
          name="billingAnchorDay"
          type="number"
          min="0"
          max="31"
          placeholder="e.g. 1 = 1st of month"
          defaultValue={company?.billingAnchorDay ?? ""}
        />
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={company?.notes ?? ""} />
      </div>

      {state?.error ? (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Company onboarded.</p> : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Onboard company"}
        </Button>
      </div>
    </form>
  );
}
