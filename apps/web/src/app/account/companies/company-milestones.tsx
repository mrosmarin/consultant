"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";

import { addMilestone, deleteMilestone } from "./milestones-actions";

export type Milestone = {
  id: string;
  name: string;
  amount: string;
  status: string;
  dueDate: string | null;
};

export function CompanyMilestones({
  companyId,
  currency,
  milestones,
}: {
  companyId: string;
  currency: string;
  milestones: Milestone[];
}) {
  const [state, formAction, pending] = useActionState(addMilestone, null);

  return (
    <div className="space-y-4">
      {milestones.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No milestones yet — add the schedule below. Generating an invoice bills the pending ones.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Milestone</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{m.name}</td>
                  <td className="text-muted-foreground px-4 py-2 font-mono text-xs">
                    {m.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatMoney(Number(m.amount), currency)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        m.status === "invoiced"
                          ? "text-emerald-600 dark:text-emerald-400 text-xs font-medium"
                          : "text-muted-foreground text-xs font-medium"
                      }
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {m.status === "pending" ? (
                      <form action={deleteMilestone}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="companyId" value={companyId} />
                        <button className="text-muted-foreground hover:text-destructive text-xs">
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="grid gap-4 sm:grid-cols-3">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-2 sm:col-span-1">
          <Label htmlFor="milestone-name">Name</Label>
          <Input id="milestone-name" name="name" placeholder="e.g. Phase 1 — Discovery" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="milestone-amount">Amount</Label>
          <Input id="milestone-amount" name="amount" type="number" step="0.01" min="0" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="milestone-due">Due date (optional)</Label>
          <Input id="milestone-due" name="dueDate" type="date" />
        </div>
        {state?.error ? (
          <p className="text-destructive text-sm sm:col-span-3">{state.error}</p>
        ) : null}
        {state?.ok ? <p className="text-brand text-sm sm:col-span-3">Milestone added.</p> : null}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add milestone"}
          </Button>
        </div>
      </form>
    </div>
  );
}
