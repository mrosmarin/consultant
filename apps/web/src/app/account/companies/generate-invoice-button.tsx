"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { generateInvoice } from "./actions";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// "Generate invoice" — posts the company id to the generateInvoice server action
// and surfaces the result (new invoice number + amount) or the error/empty state.
export function GenerateInvoiceButton({
  companyId,
  size = "default",
}: {
  companyId: string;
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
          {usd.format(Number(state.amount))}
        </span>
      ) : null}
      {state && !state.ok ? <span className="text-destructive text-sm">{state.error}</span> : null}
    </form>
  );
}
