"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { addTimeEntry } from "./actions";

const today = new Date().toISOString().slice(0, 10);

export function AddTimeEntryForm() {
  const [state, formAction, pending] = useActionState(addTimeEntry, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="workDate">Date</Label>
        <Input id="workDate" name="workDate" type="date" defaultValue={today} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="hours">Hours</Label>
        <Input id="hours" name="hours" type="number" step="0.25" min="0" max="24" required />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="client">Client / project</Label>
        <Input id="client" name="client" required />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Entry logged.</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Log time"}
        </Button>
      </div>
    </form>
  );
}
