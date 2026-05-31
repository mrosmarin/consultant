"use client";

import { useActionState } from "react";

import { sendInvoice } from "./actions";

// Per-row "Send" for an invoice (DEV-76): emails the branded PDF to the client's
// primary contact. Surfaces the result/error inline.
export function SendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(sendInvoice, null);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={invoiceId} />
      <button
        type="submit"
        disabled={pending}
        className="text-brand hover:underline text-xs disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send"}
      </button>
      {state && !state.ok ? (
        <span className="text-destructive ml-2 text-xs">{state.error}</span>
      ) : null}
      {state?.ok ? <span className="text-brand ml-2 text-xs">Sent ✓</span> : null}
    </form>
  );
}
