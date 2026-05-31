import Link from "next/link";
import { redirect } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import { SignOutButton } from "@/app/account/sign-out-button";
import { getAccess, homePathForRole } from "@/lib/auth/rbac";
import { getClientCompany } from "@/lib/client-data";

import { ClientNav } from "./client-nav";

export const dynamic = "force-dynamic";

// Read-only client portal (DEV-140). Only role=client lands here; admins/team are
// sent back to their own portal (not a 403 — it's just not their home).
export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  if (!access) redirect("/auth/sign-in?reason=auth");
  if (access.role !== "client") redirect(homePathForRole(access.role));

  const company = access.companyId ? await getClientCompany(access.companyId) : null;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-background border-b md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-4 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            Endless<span className="text-brand">Worlds</span>
          </Link>
          <p className="text-muted-foreground text-xs">{company?.name ?? "Client portal"}</p>
        </div>
        <ClientNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b px-4">
          <span className="text-muted-foreground hidden text-sm sm:inline">{access.user.email}</span>
          <ModeToggle />
          <SignOutButton />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {company ? (
            children
          ) : (
            <div className="text-muted-foreground max-w-md text-sm">
              Your account isn&apos;t linked to a company yet. Please contact EndlessWorlds and
              we&apos;ll finish setting up your access.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
