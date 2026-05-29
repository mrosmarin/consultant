"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyOption } from "@/lib/companies";

import { addTimeEntry } from "./actions";

const today = new Date().toISOString().slice(0, 10);

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

export function AddTimeEntryForm({ companies }: { companies: CompanyOption[] }) {
  const [state, formAction, pending] = useActionState(addTimeEntry, null);

  if (companies.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Onboard a company first on the{" "}
        <Link href="/account/companies" className="text-brand underline">
          Companies
        </Link>{" "}
        page — time is logged against a company.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="companyId">Company</Label>
        <select id="companyId" name="companyId" required className={selectClass} defaultValue="">
          <option value="" disabled>
            Select a company…
          </option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workDate">Date</Label>
        <Input id="workDate" name="workDate" type="date" defaultValue={today} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="hours">Hours</Label>
        <Input id="hours" name="hours" type="number" step="0.25" min="0" max="24" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="startTime">Start time (optional)</Label>
        <Input id="startTime" name="startTime" type="time" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="endTime">End time (optional)</Label>
        <Input id="endTime" name="endTime" type="time" />
      </div>

      <p className="text-muted-foreground -mt-1 text-xs sm:col-span-2">
        Enter hours directly, or leave hours blank and set start + end times to compute them.
      </p>

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
