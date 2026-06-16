"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BusinessSettings } from "@/lib/business-settings";

import { saveBusinessSettings } from "./actions";

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
}: {
  name: keyof BusinessSettings;
  label: string;
  defaultValue: string | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-t pt-6">
      <h2 className="font-medium">{children}</h2>
      {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: BusinessSettings | null }) {
  const [state, formAction, pending] = useActionState(saveBusinessSettings, null);
  const s = settings;

  return (
    <form action={formAction} className="grid max-w-2xl gap-6">
      <SectionTitle hint="Shown as the 'from' on every invoice, quote, and credit note.">
        Business identity
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="legalName" label="Legal name" defaultValue={s?.legalName ?? null} placeholder="EndlessWorlds, LLC" />
        <Field name="taxId" label="Tax ID / EIN (optional)" defaultValue={s?.taxId ?? null} />
        <Field name="email" label="Billing email" defaultValue={s?.email ?? null} type="email" />
        <Field name="phone" label="Phone" defaultValue={s?.phone ?? null} />
      </div>

      <SectionTitle>Address</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="addressLine1" label="Address line 1" defaultValue={s?.addressLine1 ?? null} />
        <Field name="addressLine2" label="Address line 2" defaultValue={s?.addressLine2 ?? null} />
        <Field name="city" label="City" defaultValue={s?.city ?? null} />
        <Field name="state" label="State / region" defaultValue={s?.state ?? null} />
        <Field name="postalCode" label="Postal code" defaultValue={s?.postalCode ?? null} />
        <Field name="country" label="Country" defaultValue={s?.country ?? null} />
      </div>

      <SectionTitle hint="All payment methods are optional — each one only appears on the invoice when filled in.">
        Payment — Bank / ACH / wire
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="bankName" label="Bank name" defaultValue={s?.bankName ?? null} />
        <Field name="bankAccountName" label="Account holder name" defaultValue={s?.bankAccountName ?? null} />
        <Field name="bankRouting" label="Routing number" defaultValue={s?.bankRouting ?? null} />
        <Field name="bankAccount" label="Account number" defaultValue={s?.bankAccount ?? null} />
      </div>

      <SectionTitle>Payment — Check by mail</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="checkPayableTo" label="Make checks payable to" defaultValue={s?.checkPayableTo ?? null} />
        <Field name="checkMailingAddress" label="Mail checks to" defaultValue={s?.checkMailingAddress ?? null} />
      </div>

      <SectionTitle>Payment — Online</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="zelle" label="Zelle (email or phone)" defaultValue={s?.zelle ?? null} />
        <Field name="venmo" label="Venmo handle" defaultValue={s?.venmo ?? null} />
        <Field name="paypal" label="PayPal" defaultValue={s?.paypal ?? null} />
        <Field name="payLinkUrl" label="Pay link (URL)" defaultValue={s?.payLinkUrl ?? null} type="url" />
      </div>

      <SectionTitle>Payment — Note</SectionTitle>
      <Field
        name="remitNote"
        label="Extra remittance note (optional)"
        defaultValue={s?.remitNote ?? null}
        placeholder="e.g. Please include the invoice number with your payment."
      />

      <div className="flex items-center gap-3 border-t pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {state?.ok ? <span className="text-muted-foreground text-sm">Saved.</span> : null}
        {state && !state.ok ? <span className="text-destructive text-sm">{state.error}</span> : null}
      </div>
    </form>
  );
}
