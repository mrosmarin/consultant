"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addContact, deleteContact, setPrimaryContact } from "./contacts-actions";

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
};

export function CompanyContacts({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: Contact[];
}) {
  const [state, formAction, pending] = useActionState(addContact, null);

  return (
    <div className="space-y-4">
      {contacts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No contacts yet — add one below.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {c.name}
                    {c.isPrimary ? (
                      <span className="text-brand ml-2 text-xs font-medium">Primary</span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground px-4 py-2">{c.email ?? "—"}</td>
                  <td className="text-muted-foreground px-4 py-2">{c.phone ?? "—"}</td>
                  <td className="text-muted-foreground px-4 py-2">{c.role ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      {!c.isPrimary ? (
                        <form action={setPrimaryContact}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="companyId" value={companyId} />
                          <button className="text-muted-foreground hover:text-foreground text-xs">
                            Make primary
                          </button>
                        </form>
                      ) : null}
                      <form action={deleteContact}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="companyId" value={companyId} />
                        <button className="text-muted-foreground hover:text-destructive text-xs">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="companyId" value={companyId} />
        <div className="grid gap-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-email">Email (optional)</Label>
          <Input id="contact-email" name="email" type="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-phone">Phone (optional)</Label>
          <Input id="contact-phone" name="phone" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-role">Role / title (optional)</Label>
          <Input id="contact-role" name="role" placeholder="e.g. Billing, Project lead" />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="contact-primary"
            name="isPrimary"
            type="checkbox"
            value="true"
            className="border-input size-4 rounded border"
          />
          <Label htmlFor="contact-primary" className="font-normal">
            Primary contact
          </Label>
        </div>
        {state?.error ? (
          <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>
        ) : null}
        {state?.ok ? <p className="text-brand text-sm sm:col-span-2">Contact added.</p> : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}
