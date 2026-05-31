"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { inviteEmail, type AccessState } from "./actions";

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin — full access" },
  { value: "team_member", label: "Team member — timesheets only" },
  { value: "client", label: "Client — read-only, their company" },
];

export function InviteForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<AccessState, FormData>(inviteEmail, null);
  const [role, setRole] = useState("client");

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-4 sm:items-end">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="person@example.com" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          className={selectClass}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="companyId">Company {role === "client" ? "" : "(clients only)"}</Label>
        <select
          id="companyId"
          name="companyId"
          className={selectClass}
          defaultValue=""
          disabled={role !== "client"}
        >
          <option value="">{role === "client" ? "Select a company…" : "—"}</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {state?.error ? <p className="text-destructive text-sm sm:col-span-4">{state.error}</p> : null}
      {state?.ok ? <p className="text-brand text-sm sm:col-span-4">Access granted.</p> : null}
      <div className="sm:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Grant access"}
        </Button>
      </div>
    </form>
  );
}
