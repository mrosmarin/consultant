"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyOption } from "@/lib/companies";

import { saveProject } from "./actions";

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

export type ProjectFormValues = {
  id: string;
  companyId: string;
  name: string;
  status: string;
  hourlyRate: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export function ProjectForm({
  companies,
  project,
}: {
  companies: CompanyOption[];
  project?: ProjectFormValues;
}) {
  const [state, formAction, pending] = useActionState(saveProject, null);
  const editing = Boolean(project);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {editing ? <input type="hidden" name="id" value={project!.id} /> : null}

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="companyId">Company</Label>
        <select
          id="companyId"
          name="companyId"
          required
          className={selectClass}
          defaultValue={project?.companyId ?? ""}
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

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" defaultValue={project?.name ?? ""} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          className={selectClass}
          defaultValue={project?.status ?? "active"}
        >
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="hourlyRate">Hourly rate override (optional)</Label>
        <Input
          id="hourlyRate"
          name="hourlyRate"
          type="number"
          step="0.01"
          min="0"
          placeholder="Defaults to the company rate"
          defaultValue={project?.hourlyRate ?? ""}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="startDate">Start date (optional)</Label>
        <Input id="startDate" name="startDate" type="date" defaultValue={project?.startDate ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="endDate">End date (optional)</Label>
        <Input id="endDate" name="endDate" type="date" defaultValue={project?.endDate ?? ""} />
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={project?.notes ?? ""} />
      </div>

      {state?.error ? (
        <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Project saved.</p> : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add project"}
        </Button>
      </div>
    </form>
  );
}
