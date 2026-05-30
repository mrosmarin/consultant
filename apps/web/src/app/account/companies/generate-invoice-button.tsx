"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

import { generateInvoice } from "./actions";

// "Generate invoice" — posts the company id to the generateInvoice server action
// and surfaces the result (new invoice number + amount) or the error/empty state.
export function GenerateInvoiceButton({
  companyId,
  currency,
  size = "default",
}: {
  companyId: string;
  currency?: string;
  size?: "default" | "sm";
}) {
  const [state, formAction, pending] = useActionState(generateInvoice, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="companyId" value={companyId} />
      <Button type="submit" disabled={pending} variant="outline" size={size}>
        {pending ? "Generating…" : "Generate invoice"}
      </Button>
      {state?.ok ? (
        <span className="text-brand text-sm">
          Created draft <span className="font-mono">{state.invoiceNumber}</span> ·{" "}
          {formatMoney(Number(state.amount), currency)}
        </span>
      ) : null}
      {state && !state.ok ? <span className="text-destructive text-sm">{state.error}</span> : null}
    </form>
  );
}
