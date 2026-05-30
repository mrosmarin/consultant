"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestInvoicePrefix } from "@/lib/billing";
import { CURRENCIES } from "@/lib/money";

import { saveCompany } from "./actions";

// Kept local (not imported from the Drizzle schema) so this client bundle
// doesn't pull the server-only db module. Must stay in sync with BILLING_TYPES
// / BILLING_FREQUENCIES in src/db/schema.ts.
const BILLING_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly rate" },
  { value: "retainer", label: "Flat retainer" },
  { value: "fixed", label: "Fixed project fee" },
  { value: "milestone", label: "Milestone billing" },
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
  fixedAmount: string | null;
  billingFrequency: string;
  billingAnchorDay: number | null;
  paymentTermsDays: number | null;
  invoicePrefix: string | null;
  currency: string | null;
  taxRate: string | null;
  taxLabel: string | null;
  taxExempt: boolean;
};

export function CompanyForm({ company }: { company?: CompanyFormValues }) {
  const [state, formAction, pending] = useActionState(saveCompany, null);
  const [billingType, setBillingType] = useState(company?.billingType ?? "hourly");
  const editing = Boolean(company);

  // Invoice prefix auto-suggests from the name while onboarding, until the user
  // edits it. In edit mode we leave the saved prefix alone.
  const [name, setName] = useState(company?.name ?? "");
  const [prefix, setPrefix] = useState(company?.invoicePrefix ?? "");
  const [prefixTouched, setPrefixTouched] = useState(false);
  const onNameChange = (value: string) => {
    setName(value);
    if (!editing && !prefixTouched) setPrefix(suggestInvoicePrefix(value));
  };

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {editing ? <input type="hidden" name="id" value={company!.id} /> : null}

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="name">Company name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="invoicePrefix">Invoice prefix</Label>
        <Input
          id="invoicePrefix"
          name="invoicePrefix"
          value={prefix}
          onChange={(e) => {
            setPrefixTouched(true);
            setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
          }}
          placeholder="ACME"
        />
        <p className="text-muted-foreground text-xs">
          Used for generated invoice numbers, e.g. <span className="font-mono">{(prefix || "INV")}-0001</span>. Auto-suggested from the name; edit to override.
        </p>
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

      <div className="grid gap-2">
        <Label htmlFor="currency">Currency</Label>
        <select
          id="currency"
          name="currency"
          defaultValue={company?.currency ?? "USD"}
          className={selectClass}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="paymentTermsDays">Payment terms</Label>
        <select
          id="paymentTermsDays"
          name="paymentTermsDays"
          defaultValue={String(company?.paymentTermsDays ?? 30)}
          className={selectClass}
        >
          <option value="0">Due on receipt</option>
          <option value="15">Net 15</option>
          <option value="30">Net 30</option>
          <option value="45">Net 45</option>
          <option value="60">Net 60</option>
        </select>
      </div>

      {billingType === "hourly" ? (
        <div className="grid gap-2">
          <Label htmlFor="hourlyRate">Hourly rate</Label>
          <Input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={company?.hourlyRate ?? ""}
          />
        </div>
      ) : billingType === "retainer" ? (
        <div className="grid gap-2">
          <Label htmlFor="retainerAmount">Retainer amount (per period)</Label>
          <Input
            id="retainerAmount"
            name="retainerAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={company?.retainerAmount ?? ""}
          />
        </div>
      ) : billingType === "fixed" ? (
        <div className="grid gap-2">
          <Label htmlFor="fixedAmount">Fixed project fee</Label>
          <Input
            id="fixedAmount"
            name="fixedAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={company?.fixedAmount ?? ""}
          />
        </div>
      ) : (
        <div className="grid gap-2 sm:col-span-2">
          <p className="text-muted-foreground text-sm">
            Milestone billing — add the milestone schedule (name + amount) below after saving.
            Generating an invoice bills the pending milestones.
          </p>
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

      <div className="grid gap-2">
        <Label htmlFor="taxRate">Default tax rate (%)</Label>
        <Input
          id="taxRate"
          name="taxRate"
          type="number"
          step="0.001"
          min="0"
          max="100"
          placeholder="e.g. 8.875"
          defaultValue={company?.taxRate ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="taxLabel">Tax label (optional)</Label>
        <Input
          id="taxLabel"
          name="taxLabel"
          placeholder="e.g. NY Sales Tax"
          defaultValue={company?.taxLabel ?? ""}
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="taxExempt"
          defaultChecked={company?.taxExempt ?? false}
          className="size-4"
        />
        Tax-exempt client (never apply tax, even if a rate is set)
      </label>

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
