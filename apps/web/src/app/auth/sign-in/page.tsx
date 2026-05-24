"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInWithEmail } from "./actions";

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(signInWithEmail, null);

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Sign in</h1>
      <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
        <input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
        />
        <button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {state?.error ? <p style={{ color: "crimson" }}>{state.error}</p> : null}
      <p>
        No account? <Link href="/auth/sign-up">Sign up</Link>
      </p>
    </main>
  );
}
