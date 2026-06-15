"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_GUIDANCE } from "@/lib/auth/password";

import { resetPassword } from "./actions";

// Reads the reset `token` from the URL (Neon Auth appends it to the link) and
// posts it with the new password. Rendered inside a Suspense boundary because
// useSearchParams suspends.
export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState(resetPassword, null);

  if (!token) {
    return (
      <CardContent className="grid gap-4">
        <p className="border-input text-muted-foreground rounded-md border px-3 py-2 text-sm">
          This reset link is invalid or has expired.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/forgot-password">Request a new link</Link>
        </Button>
      </CardContent>
    );
  }

  return (
    <form action={formAction}>
      <CardContent className="grid gap-4">
        <input type="hidden" name="token" value={token} />
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <p className="text-muted-foreground text-xs">{PASSWORD_GUIDANCE}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </div>
        {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      </CardContent>
      <CardFooter className="mt-6 flex flex-col gap-3">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
        <p className="text-muted-foreground text-sm">
          <Link href="/auth/sign-in" className="text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </form>
  );
}
