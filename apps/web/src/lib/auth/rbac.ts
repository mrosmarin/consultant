import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { allowedEmails, ROLES, type Role } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { normalizeEmail } from "@/lib/auth/allowlist";

// Role-based access control (DEV-69). The signed-in user's role is resolved from
// their allowlist row (keyed by email) — the invite IS the role assignment, so
// there's no separate role table to keep in sync. All portal guards funnel
// through here so authorization lives in one place.

export type SessionUser = { id: string; email: string; name: string | null };
export type Access = { user: SessionUser; role: Role; companyId: string | null };

// Current session + its portal role, or null when unauthenticated OR the email
// is no longer allowed (revoked access ⇒ treated as signed-out).
export async function getAccess(): Promise<Access | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.email) return null;

  const email = normalizeEmail(session.user.email);
  const [row] = await db
    .select({ role: allowedEmails.role, companyId: allowedEmails.companyId })
    .from(allowedEmails)
    .where(and(eq(allowedEmails.email, email), isNull(allowedEmails.deletedAt)))
    .limit(1);
  if (!row) return null;

  return {
    user: { id: session.user.id, email, name: session.user.name ?? null },
    role: row.role as Role,
    companyId: row.companyId,
  };
}

// Where a role lands after sign-in. Clients get the read-only /client portal
// (DEV-140); admins and team members use the /account portal.
export function homePathForRole(role: Role): string {
  return role === "client" ? "/client" : "/account";
}

// Resolve a role straight from the allowlist by email — used by the auth actions
// to pick the post-sign-in landing page before the session cookie is readable.
// Returns null when the email isn't on the (live) allowlist.
export async function roleForEmail(email: string): Promise<Role | null> {
  const [row] = await db
    .select({ role: allowedEmails.role })
    .from(allowedEmails)
    .where(and(eq(allowedEmails.email, normalizeEmail(email)), isNull(allowedEmails.deletedAt)))
    .limit(1);
  return row ? (row.role as Role) : null;
}

// Page/layout guard: require an authenticated user whose role is in `roles`.
//   - no session / revoked → /auth/sign-in?reason=auth (sign-in shows a notice)
//   - authenticated but wrong role → /forbidden (403 page)
// Returns the resolved Access when allowed (never returns on redirect).
export async function requireRole(roles: readonly Role[]): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/auth/sign-in?reason=auth");
  if (!roles.includes(access.role)) redirect("/forbidden");
  return access;
}

// Any signed-in, allowed user (role-agnostic).
export async function requireUser(): Promise<Access> {
  return requireRole(ROLES);
}

// Admin-only.
export async function requireAdmin(): Promise<Access> {
  return requireRole(["admin"]);
}

// The tenant (consultant) a user's logged time belongs to (DEV-141). Admins and
// everyone else own their own data; a team member's time rolls up to the
// consultant — resolved as the single admin account. Used to scope a team
// member's timesheet to the tenant's companies and to stamp new entries with
// user_id = the tenant owner (so the time flows into the tenant's invoicing
// with no change to the owner-scoped billing queries).
export async function getTenantOwnerId(access: Access): Promise<string> {
  if (access.role !== "team_member") return access.user.id;
  const res = await db.execute(
    sql`select u.id::text as id from neon_auth."user" u
        join allowed_emails a on a.email = lower(u.email)
        where a.role = 'admin' and a.deleted_at is null
        order by u."createdAt" asc limit 1`,
  );
  const rows = (Array.isArray(res) ? res : (res as { rows?: unknown[] }).rows) ?? [];
  const owner = (rows[0] as { id?: string } | undefined)?.id;
  return owner ?? access.user.id;
}
