"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { addExpense } from "./actions";

export type ExpenseCompany = { id: string; name: string };
export type ExpenseProject = { id: string; name: string; companyId: string };

const CATEGORIES = [
  "Travel",
  "Meals",
  "Lodging",
  "Software",
  "Hardware",
  "Subcontractor",
  "Other",
];

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

export function AddExpenseForm({
  companies,
  projects,
}: {
  companies: ExpenseCompany[];
  projects: ExpenseProject[];
}) {
  const [state, formAction, pending] = useActionState(addExpense, null);
  const [companyId, setCompanyId] = useState("");
  const [mode, setMode] = useState<"expense" | "mileage">("expense");
  // Mirrors DEFAULT_MILEAGE_RATE in the schema; the server re-validates.
  const [distance, setDistance] = useState("");
  const [rate, setRate] = useState("0.70");
  const mileageAmount = Math.round((Number(distance) || 0) * (Number(rate) || 0) * 100) / 100;

  if (companies.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Onboard a company first on the{" "}
        <Link href="/account/companies" className="text-brand underline">
          Companies
        </Link>{" "}
        page — expenses are logged against a company.
      </p>
    );
  }

  const companyProjects = projects.filter((p) => p.companyId === companyId);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="companyId">Company</Label>
        <select
          id="companyId"
          name="companyId"
          required
          className={selectClass}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
        >
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
        <Label htmlFor="projectId">Project (optional)</Label>
        <select id="projectId" name="projectId" className={selectClass} defaultValue="">
          <option value="">— none —</option>
          {companyProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expenseDate">Date</Label>
        <Input id="expenseDate" name="expenseDate" type="date" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mode">Type</Label>
        <select
          id="mode"
          className={selectClass}
          value={mode}
          onChange={(e) => setMode(e.target.value as "expense" | "mileage")}
        >
          <option value="expense">Expense</option>
          <option value="mileage">Mileage</option>
        </select>
      </div>

      {mode === "expense" ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select id="category" name="category" className={selectClass} defaultValue="Other">
              {CATEGORIES.filter((c) => c !== "Mileage").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="category" value="Mileage" />
          <div className="grid gap-2">
            <Label htmlFor="distance">Distance (mi)</Label>
            <Input
              id="distance"
              name="distance"
              type="number"
              step="0.1"
              min="0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitRate">Rate (per mi)</Label>
            <Input
              id="unitRate"
              name="unitRate"
              type="number"
              step="0.001"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">Amount: {mileageAmount.toFixed(2)}</p>
          </div>
        </>
      )}

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="receiptKey">Receipt reference (optional)</Label>
        <Input id="receiptKey" name="receiptKey" placeholder="link or note (upload comes with docs)" />
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="billable" defaultChecked className="size-4" />
        Billable (rolls into the client&apos;s next invoice)
      </label>

      {state?.error ? (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Expense logged.</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || !companyId}>
          {pending ? "Saving…" : "Log expense"}
        </Button>
      </div>
    </form>
  );
}
