import { redirect } from "next/navigation";

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
    <main style={{ maxWidth: 480, margin: "4rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Account</h1>
      <p>
        Signed in as <strong>{session.user.email}</strong>
      </p>
      <SignOutButton />
    </main>
  );
}
