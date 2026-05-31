"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { allowedEmails, companies, ROLES, type Role } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/allowlist";
import { getAccess } from "@/lib/auth/rbac";

// Admin access management (DEV-69). Invite an email with a role (and, for
// clients, the company they may view), or revoke access (soft-delete). Every
// action is admin-gated server-side — the UI being admin-only is not the
// enforcement. Audit logging of these privileged actions lands with DEV-136.

export type AccessState = { ok: boolean; error?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteEmail(_prev: AccessState, formData: FormData): Promise<AccessState> {
  const admin = await getAccess();
  if (!admin || admin.role !== "admin") return { ok: false, error: "Admins only." };

  const email = normalizeEmail((formData.get("email") as string) ?? "");
  const role = (((formData.get("role") as string) ?? "").trim() || "client") as Role;
  let companyId = ((formData.get("companyId") as string) ?? "").trim() || null;

  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { ok: false, error: "Pick a valid role." };

  if (role === "client") {
    if (!companyId) return { ok: false, error: "Pick the company this client belongs to." };
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(eq(companies.id, companyId), eq(companies.userId, admin.user.id), isNull(companies.deletedAt)),
      )
      .limit(1);
    if (!company) return { ok: false, error: "Pick one of your companies." };
  } else {
    companyId = null; // admin / team_member are not company-scoped
  }

  // Upsert by email: revive + re-role an existing (incl. revoked) row, else
  // insert. The email column is unique, so we can't blind-insert a duplicate.
  const [existing] = await db
    .select({ id: allowedEmails.id })
    .from(allowedEmails)
    .where(eq(allowedEmails.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(allowedEmails)
      .set({ role, companyId, deletedAt: null })
      .where(eq(allowedEmails.id, existing.id));
  } else {
    await db.insert(allowedEmails).values({ email, role, companyId });
  }

  revalidatePath("/account/access");
  return { ok: true };
}

export async function revokeEmail(formData: FormData): Promise<void> {
  const admin = await getAccess();
  if (!admin || admin.role !== "admin") return;

  const id = (formData.get("id") as string)?.trim();
  if (!id) return;

  // Never let an admin lock themselves out by revoking their own access.
  const [row] = await db
    .select({ email: allowedEmails.email })
    .from(allowedEmails)
    .where(eq(allowedEmails.id, id))
    .limit(1);
  if (!row || row.email === admin.user.email) return;

  await db.update(allowedEmails).set({ deletedAt: new Date() }).where(eq(allowedEmails.id, id));
  revalidatePath("/account/access");
}
