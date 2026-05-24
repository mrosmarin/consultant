import { redirect } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";

import { SignOutButton } from "./sign-out-button";

// Protected portal entry. proxy.ts also guards /account/*, but we re-check
// here and use the session for rendering.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your EndlessWorlds portal.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            Signed in as <strong>{session.user.email}</strong>
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
