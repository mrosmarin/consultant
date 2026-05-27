import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { allowedEmails } from "@/db/schema";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Portal access allowlist: only emails present in allowed_emails (not
// soft-deleted) may sign up / sign in. Enforced in the auth server actions.
export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const [row] = await db
    .select({ id: allowedEmails.id })
    .from(allowedEmails)
    .where(and(eq(allowedEmails.email, normalized), isNull(allowedEmails.deletedAt)))
    .limit(1);

  return Boolean(row);
}
