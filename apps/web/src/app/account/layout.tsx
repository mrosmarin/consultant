import Link from "next/link";
import { redirect } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import { auth } from "@/lib/auth/server";

import { PortalNav } from "./portal-nav";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-background border-b md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-4 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            Endless<span className="text-brand">Worlds</span>
          </Link>
          <p className="text-muted-foreground text-xs">Portal</p>
        </div>
        <PortalNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b px-4">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {session.user.email}
          </span>
          <ModeToggle />
          <SignOutButton />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
