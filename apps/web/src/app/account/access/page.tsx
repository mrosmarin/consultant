import { asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { allowedEmails, companies } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";

import { revokeEmail } from "./actions";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  team_member: "Team member",
  client: "Client",
};

export default async function AccessPage() {
  const admin = await requireAdmin();

  const [rows, companyRows] = await Promise.all([
    db
      .select({
        id: allowedEmails.id,
        email: allowedEmails.email,
        role: allowedEmails.role,
        companyId: allowedEmails.companyId,
        createdAt: allowedEmails.createdAt,
      })
      .from(allowedEmails)
      .where(isNull(allowedEmails.deletedAt))
      .orderBy(asc(allowedEmails.email)),
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.userId, admin.user.id))
      .orderBy(asc(companies.name)),
  ]);
  const companyName = new Map(companyRows.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access management</h1>
        <p className="text-muted-foreground text-sm">
          Control who can sign in to the portal and what they can do. Only the emails listed here
          may create an account or sign in.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="font-medium">Grant access</h2>
        <InviteForm companies={companyRows} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-muted-foreground text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSelf = r.email === admin.user.email;
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    {r.email}
                    {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                  </td>
                  <td className="px-4 py-2">{ROLE_LABEL[r.role] ?? r.role}</td>
                  <td className="px-4 py-2">
                    {r.role === "client" ? (companyName.get(r.companyId ?? "") ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isSelf ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <form action={revokeEmail}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-destructive text-sm hover:underline">
                          Revoke
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
