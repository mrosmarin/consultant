"use client";

import { useActionState, useState } from "react";

import type { InvoiceDeleteMode } from "@/db/schema";

import { deleteInvoice } from "./actions";

const BLOCK_MSG = "Deleting sent/paid invoices is off — change it in Settings.";
const WARN_MSG = "Delete this issued invoice? Its time entries and expenses will be un-billed.";

// Delete control that mirrors the owner's invoice-delete-protection setting
// (DEV-155). Drafts always delete. Issued (non-draft) invoices: block disables
// the action, warn confirms first, allow deletes. The server action enforces
// the same rules authoritatively — this is just the UX.
export function DeleteInvoiceButton({
  invoiceId,
  status,
  mode,
}: {
  invoiceId: string;
  status: string;
  mode: InvoiceDeleteMode;
}) {
  const [state, formAction, pending] = useActionState(deleteInvoice, null);
  const [note, setNote] = useState<string | null>(null);

  const issued = status !== "draft";
  const blocked = issued && mode === "block";
  const error = note ?? (state && !state.ok ? state.error : null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (blocked) {
          e.preventDefault();
          setNote(BLOCK_MSG);
          return;
        }
        if (issued && mode === "warn" && !window.confirm(WARN_MSG)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={invoiceId} />
      {/* Set when the form submits; the server's warn-mode check requires it. */}
      <input type="hidden" name="confirm" value="1" />
      <button
        type="submit"
        disabled={pending}
        title={blocked ? BLOCK_MSG : undefined}
        className={`text-xs ${blocked ? "text-muted-foreground/60" : "text-muted-foreground hover:text-destructive"}`}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? <span className="text-destructive ml-2 text-xs">{error}</span> : null}
    </form>
  );
}
