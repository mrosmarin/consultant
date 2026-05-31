import Link from "next/link";

import { getAccess, homePathForRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

// 403 surface (DEV-69). Page guards redirect here when an authenticated user
// hits a section their role can't access. We can't set a 403 status on a
// rendered page, so the copy carries the meaning; the "go to your portal" link
// routes the user back to the home they ARE allowed to use.
export default async function ForbiddenPage() {
  const access = await getAccess();
  const home = access ? homePathForRole(access.role) : "/auth/sign-in";

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-brand font-mono text-sm font-semibold">403 — Forbidden</p>
        <h1 className="text-2xl font-semibold tracking-tight">You don&apos;t have access to this page</h1>
        <p className="text-muted-foreground text-sm">
          Your account isn&apos;t permitted to view this section of the portal. If you think this
          is a mistake, contact the portal administrator.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href={home}
            className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-md px-4 py-2 text-sm font-medium"
          >
            {access ? "Go to your portal" : "Sign in"}
          </Link>
          <Link
            href="/"
            className="border-input hover:bg-secondary rounded-md border px-4 py-2 text-sm"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
