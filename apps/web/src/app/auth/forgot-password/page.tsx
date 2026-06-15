"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);
  const sent = state !== null && "ok" in state;

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {sent
              ? "Check your inbox."
              : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="grid gap-4">
            <p className="border-input text-muted-foreground rounded-md border px-3 py-2 text-sm">
              If an account exists for that email, a password-reset link is on its
              way. The link expires shortly — check spam if you don&apos;t see it.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/sign-in">Back to sign in</Link>
            </Button>
          </CardContent>
        ) : (
          <form action={formAction}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              {state && "error" in state ? (
                <p className="text-destructive text-sm">{state.error}</p>
              ) : null}
            </CardContent>
            <CardFooter className="mt-6 flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-muted-foreground text-sm">
                Remembered it?{" "}
                <Link
                  href="/auth/sign-in"
                  className="text-foreground underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
